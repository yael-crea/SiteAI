package main

import (
	"bytes"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

func TestPosterSiteURL(t *testing.T) {
	tests := []struct {
		name, slug, domain string
		verified           bool
		wantTarget         string
		wantDisplay        string
	}{
		{"lumio", "plombier-eclair", "", false, "https://lumio.business/site/plombier-eclair?utm_source=affichette", "lumio.business/site/plombier-eclair"},
		{"domaine vérifié", "plombier-eclair", "Plomberie-Eclair.fr", true, "https://plomberie-eclair.fr/?utm_source=affichette", "plomberie-eclair.fr"},
		{"domaine non vérifié", "plombier-eclair", "plomberie-eclair.fr", false, "https://lumio.business/site/plombier-eclair?utm_source=affichette", "lumio.business/site/plombier-eclair"},
		{"domaine invalide", "plombier-eclair", "evil.fr/phish?x=", true, "https://lumio.business/site/plombier-eclair?utm_source=affichette", "lumio.business/site/plombier-eclair"},
		{"slug échappé", "a b", "", false, "https://lumio.business/site/a%20b?utm_source=affichette", "lumio.business/site/a%20b"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			target, display := posterSiteURL(test.slug, test.domain, test.verified)
			if target != test.wantTarget || display != test.wantDisplay {
				t.Fatalf("got (%q, %q), want (%q, %q)", target, display, test.wantTarget, test.wantDisplay)
			}
		})
	}
}

func TestEncodeQRStructure(t *testing.T) {
	for _, length := range []int{1, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213} {
		data := []byte(strings.Repeat("a", length))
		qr, err := encodeQR(data)
		if err != nil {
			t.Fatalf("%d octets : %v", length, err)
		}
		if (qr.Size-17)%4 != 0 || qr.Size < 21 || qr.Size > 57 {
			t.Fatalf("%d octets : taille %d invalide", length, qr.Size)
		}
		// The three finder patterns: dark 7x7 ring, light ring, dark 3x3 core.
		for _, corner := range [][2]int{{0, 0}, {qr.Size - 7, 0}, {0, qr.Size - 7}} {
			for dy := 0; dy < 7; dy++ {
				for dx := 0; dx < 7; dx++ {
					distance := max(qrAbs(dx-3), qrAbs(dy-3))
					want := distance != 2
					if qr.Modules[corner[1]+dy][corner[0]+dx] != want {
						t.Fatalf("%d octets : motif de repérage incorrect en %v", length, corner)
					}
				}
			}
		}
		if !qr.Modules[qr.Size-8][8] {
			t.Fatalf("%d octets : module sombre obligatoire absent", length)
		}
		// Both copies of the format information must be identical.
		first, second := 0, 0
		firstAt := func(i int) bool {
			switch {
			case i <= 5:
				return qr.Modules[i][8]
			case i == 6:
				return qr.Modules[7][8]
			case i == 7:
				return qr.Modules[8][8]
			case i == 8:
				return qr.Modules[8][7]
			default:
				return qr.Modules[8][14-i]
			}
		}
		secondAt := func(i int) bool {
			if i < 8 {
				return qr.Modules[8][qr.Size-1-i]
			}
			return qr.Modules[qr.Size-15+i][8]
		}
		for i := 0; i < 15; i++ {
			first |= boolBit(firstAt(i)) << i
			second |= boolBit(secondAt(i)) << i
		}
		if first != second {
			t.Fatalf("%d octets : informations de format incohérentes", length)
		}
		// Error correction level M is encoded as 00 in bits 14-13 once the
		// 0x5412 mask is removed.
		if format := first ^ 0x5412; format>>13 != 0 {
			t.Fatalf("%d octets : niveau de correction inattendu (%015b)", length, format)
		}
	}

	if _, err := encodeQR(bytes.Repeat([]byte("a"), 214)); !errors.Is(err, errQRDataTooLong) {
		t.Fatalf("une URL trop longue doit être refusée, reçu %v", err)
	}
}

func boolBit(value bool) int {
	if value {
		return 1
	}
	return 0
}

func TestQRReedSolomonKnownVector(t *testing.T) {
	// Example from the QR specification (1-M "01234567"):
	// data codewords and their 10 error correction codewords.
	data := []byte{0x10, 0x20, 0x0C, 0x56, 0x61, 0x80, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11}
	want := []byte{0xA5, 0x24, 0xD4, 0xC1, 0xED, 0x36, 0xC7, 0x87, 0x2C, 0x55}
	got := qrRSRemainder(data, qrRSGenerator(10))
	if !bytes.Equal(got, want) {
		t.Fatalf("Reed-Solomon : got % X, want % X", got, want)
	}
}

func testPosterDocument(style string) posterDocument {
	target, display := posterSiteURL("plomberie-eclair", "", false)
	return posterDocument{
		BusinessName: "Plomberie Éclair",
		Activity:     "Plombier chauffagiste",
		Phone:        "06 12 34 56 78",
		DesignStyle:  style,
		AccentColor:  "#0f766e",
		TargetURL:    target,
		DisplayURL:   display,
		PublicSlug:   "plomberie-eclair",
	}
}

func TestGeneratePosterPDF(t *testing.T) {
	for _, style := range []string{"moderne", "elegant", "artisan"} {
		t.Run(style, func(t *testing.T) {
			pdf, err := generatePosterPDF(testPosterDocument(style))
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.HasPrefix(pdf, []byte("%PDF-1.4")) {
				t.Fatal("le document généré n'est pas un PDF")
			}
			for _, want := range [][]byte{
				[]byte("/MediaBox [0 0 420 595]"), // A5
				[]byte("/WinAnsiEncoding"),
				[]byte("(Plomberie \xC9clair)"),
				[]byte("(Plombier chauffagiste)"),
				[]byte("(Demandez votre devis en ligne)"),
				[]byte("(06 12 34 56 78)"),
				[]byte("(lumio.business/site/plomberie-eclair)"),
				[]byte("(Site cr\xE9\xE9 avec Lumio)"),
				[]byte("0.059 0.463 0.431 rg"), // accent #0f766e
			} {
				if !bytes.Contains(pdf, want) {
					t.Errorf("contenu absent du PDF : %q", want)
				}
			}
			assertValidXref(t, pdf)
		})
	}

	moderne, _ := generatePosterPDF(testPosterDocument("moderne"))
	elegant, _ := generatePosterPDF(testPosterDocument("elegant"))
	if !bytes.Contains(moderne, []byte("/Helvetica-Bold")) || !bytes.Contains(elegant, []byte("/Times-Bold")) {
		t.Fatal("le style du site doit changer la typographie de l'affichette")
	}
}

func TestGeneratePosterPDFWithoutPhoneAndLongName(t *testing.T) {
	document := testPosterDocument("moderne")
	document.Phone = ""
	document.BusinessName = "Entreprise Générale de Rénovation et de Maçonnerie Dupont-Martin & Fils"
	pdf, err := generatePosterPDF(document)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(pdf, []byte("(T\xE9l. )")) {
		t.Fatal("aucun libellé téléphone ne doit apparaître sans numéro")
	}
	if !bytes.Contains(pdf, []byte("Dupont-Martin & Fils")) {
		t.Fatal("un nom long doit être réparti sur deux lignes, pas tronqué")
	}
	assertValidXref(t, pdf)
}

func assertValidXref(t *testing.T, pdf []byte) {
	t.Helper()
	match := regexp.MustCompile(`startxref\n(\d+)\n%%EOF$`).FindSubmatch(pdf)
	if match == nil {
		t.Fatal("startxref absent")
	}
	xref, _ := strconv.Atoi(string(match[1]))
	if !bytes.HasPrefix(pdf[xref:], []byte("xref\n")) {
		t.Fatal("startxref ne pointe pas vers la table xref")
	}
	offsets := regexp.MustCompile(`(\d{10}) 00000 n `).FindAllSubmatch(pdf[xref:], -1)
	for index, offset := range offsets {
		position, _ := strconv.Atoi(string(offset[1]))
		if !bytes.HasPrefix(pdf[position:], []byte(fmt.Sprintf("%d 0 obj", index+1))) {
			t.Fatalf("offset xref incorrect pour l'objet %d", index+1)
		}
	}
}

func TestWinAnsiText(t *testing.T) {
	if got := winAnsiText("Tél. – 20 € l’heure ✓"); got != "T\xE9l. \x96 20 \x80 l\x92heure ?" {
		t.Fatalf("encodage inattendu : %q", got)
	}
}

func TestNormalizeUTMSource(t *testing.T) {
	for input, want := range map[string]string{
		"affichette":            "affichette",
		" Affichette ":          "affichette",
		"flyer_2026-a":          "flyer_2026-a",
		"<script>":              "",
		"":                      "",
		strings.Repeat("a", 41): "",
	} {
		if got := normalizeUTMSource(input); got != want {
			t.Errorf("normalizeUTMSource(%q) = %q, want %q", input, got, want)
		}
	}
}
