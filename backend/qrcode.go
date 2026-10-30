package main

import "errors"

// Minimal QR Code encoder (ISO/IEC 18004) used by the printable poster.
// Byte mode, error correction level M, versions 1 to 10 (up to 213 bytes),
// which is plenty for a site URL. Kept dependency-free on purpose, like the
// hand-written PDFs in quotes.go.

var errQRDataTooLong = errors.New("qr: données trop longues")

type qrVersionInfo struct {
	ecPerBlock int
	// groups of {block count, data codewords per block}
	groups [][2]int
	align  []int
}

// Level M parameters for versions 1..10.
var qrVersionsM = [...]qrVersionInfo{
	1:  {10, [][2]int{{1, 16}}, nil},
	2:  {16, [][2]int{{1, 28}}, []int{6, 18}},
	3:  {26, [][2]int{{1, 44}}, []int{6, 22}},
	4:  {18, [][2]int{{2, 32}}, []int{6, 26}},
	5:  {24, [][2]int{{2, 43}}, []int{6, 30}},
	6:  {16, [][2]int{{4, 27}}, []int{6, 34}},
	7:  {18, [][2]int{{4, 31}}, []int{6, 22, 38}},
	8:  {22, [][2]int{{2, 38}, {2, 39}}, []int{6, 24, 42}},
	9:  {22, [][2]int{{3, 36}, {2, 37}}, []int{6, 26, 46}},
	10: {26, [][2]int{{4, 43}, {1, 44}}, []int{6, 28, 50}},
}

func (v qrVersionInfo) dataCodewords() int {
	total := 0
	for _, group := range v.groups {
		total += group[0] * group[1]
	}
	return total
}

// QRCode is a square matrix of modules; true means dark.
type QRCode struct {
	Size    int
	Modules [][]bool
}

func encodeQR(data []byte) (QRCode, error) {
	version := 0
	for candidate := 1; candidate < len(qrVersionsM); candidate++ {
		countBits := 8
		if candidate >= 10 {
			countBits = 16
		}
		if 4+countBits+8*len(data) <= qrVersionsM[candidate].dataCodewords()*8 {
			version = candidate
			break
		}
	}
	if version == 0 {
		return QRCode{}, errQRDataTooLong
	}
	info := qrVersionsM[version]

	// Data bit stream.
	bits := make([]bool, 0, info.dataCodewords()*8)
	appendBits := func(value, length int) {
		for i := length - 1; i >= 0; i-- {
			bits = append(bits, (value>>i)&1 == 1)
		}
	}
	appendBits(0b0100, 4)
	if version >= 10 {
		appendBits(len(data), 16)
	} else {
		appendBits(len(data), 8)
	}
	for _, b := range data {
		appendBits(int(b), 8)
	}
	capacity := info.dataCodewords() * 8
	appendBits(0, min(4, capacity-len(bits)))
	for len(bits)%8 != 0 {
		bits = append(bits, false)
	}
	for pad := 0; len(bits) < capacity; pad++ {
		if pad%2 == 0 {
			appendBits(0xEC, 8)
		} else {
			appendBits(0x11, 8)
		}
	}
	codewords := make([]byte, info.dataCodewords())
	for i, bit := range bits {
		if bit {
			codewords[i/8] |= 1 << (7 - uint(i%8))
		}
	}

	// Split into blocks, compute error correction, interleave.
	generator := qrRSGenerator(info.ecPerBlock)
	var dataBlocks, ecBlocks [][]byte
	offset := 0
	for _, group := range info.groups {
		for b := 0; b < group[0]; b++ {
			block := codewords[offset : offset+group[1]]
			offset += group[1]
			dataBlocks = append(dataBlocks, block)
			ecBlocks = append(ecBlocks, qrRSRemainder(block, generator))
		}
	}
	final := make([]byte, 0, len(codewords)+len(dataBlocks)*info.ecPerBlock)
	maxData := 0
	for _, block := range dataBlocks {
		maxData = max(maxData, len(block))
	}
	for i := 0; i < maxData; i++ {
		for _, block := range dataBlocks {
			if i < len(block) {
				final = append(final, block[i])
			}
		}
	}
	for i := 0; i < info.ecPerBlock; i++ {
		for _, block := range ecBlocks {
			final = append(final, block[i])
		}
	}

	size := version*4 + 17
	q := &qrBuilder{size: size, modules: newQRGrid(size), function: newQRGrid(size)}
	q.drawFunctionPatterns(version, info.align)
	q.drawCodewords(final)

	bestMask, bestPenalty := 0, -1
	for mask := 0; mask < 8; mask++ {
		q.applyMask(mask)
		q.drawFormatBits(mask)
		penalty := q.penalty()
		if bestPenalty < 0 || penalty < bestPenalty {
			bestMask, bestPenalty = mask, penalty
		}
		q.applyMask(mask) // XOR again to undo
	}
	q.applyMask(bestMask)
	q.drawFormatBits(bestMask)

	return QRCode{Size: size, Modules: q.modules}, nil
}

type qrBuilder struct {
	size     int
	modules  [][]bool
	function [][]bool
}

func newQRGrid(size int) [][]bool {
	grid := make([][]bool, size)
	for i := range grid {
		grid[i] = make([]bool, size)
	}
	return grid
}

func (q *qrBuilder) set(x, y int, dark bool) {
	q.modules[y][x] = dark
	q.function[y][x] = true
}

func (q *qrBuilder) drawFunctionPatterns(version int, align []int) {
	for i := 0; i < q.size; i++ {
		q.set(6, i, i%2 == 0)
		q.set(i, 6, i%2 == 0)
	}
	q.drawFinder(3, 3)
	q.drawFinder(q.size-4, 3)
	q.drawFinder(3, q.size-4)
	last := len(align) - 1
	for i := range align {
		for j := range align {
			if (i == 0 && j == 0) || (i == 0 && j == last) || (i == last && j == 0) {
				continue
			}
			q.drawAlignment(align[i], align[j])
		}
	}
	q.drawFormatBits(0) // reserve the area; overwritten later
	if version >= 7 {
		remainder := version
		for i := 0; i < 12; i++ {
			remainder = (remainder << 1) ^ ((remainder >> 11) * 0x1F25)
		}
		versionBits := version<<12 | remainder
		for i := 0; i < 18; i++ {
			dark := (versionBits>>i)&1 == 1
			a, b := q.size-11+i%3, i/3
			q.set(a, b, dark)
			q.set(b, a, dark)
		}
	}
}

func (q *qrBuilder) drawFinder(cx, cy int) {
	for dy := -4; dy <= 4; dy++ {
		for dx := -4; dx <= 4; dx++ {
			x, y := cx+dx, cy+dy
			if x < 0 || y < 0 || x >= q.size || y >= q.size {
				continue
			}
			distance := max(qrAbs(dx), qrAbs(dy))
			q.set(x, y, distance != 2 && distance != 4)
		}
	}
}

func (q *qrBuilder) drawAlignment(cx, cy int) {
	for dy := -2; dy <= 2; dy++ {
		for dx := -2; dx <= 2; dx++ {
			q.set(cx+dx, cy+dy, max(qrAbs(dx), qrAbs(dy)) != 1)
		}
	}
}

func (q *qrBuilder) drawFormatBits(mask int) {
	// Error correction level M = 0b00.
	data := 0b00<<3 | mask
	remainder := data
	for i := 0; i < 10; i++ {
		remainder = (remainder << 1) ^ ((remainder >> 9) * 0x537)
	}
	bits := (data<<10 | remainder) ^ 0x5412
	bit := func(i int) bool { return (bits>>i)&1 == 1 }

	for i := 0; i <= 5; i++ {
		q.set(8, i, bit(i))
	}
	q.set(8, 7, bit(6))
	q.set(8, 8, bit(7))
	q.set(7, 8, bit(8))
	for i := 9; i < 15; i++ {
		q.set(14-i, 8, bit(i))
	}
	for i := 0; i < 8; i++ {
		q.set(q.size-1-i, 8, bit(i))
	}
	for i := 8; i < 15; i++ {
		q.set(8, q.size-15+i, bit(i))
	}
	q.set(8, q.size-8, true) // dark module
}

func (q *qrBuilder) drawCodewords(data []byte) {
	i := 0
	for right := q.size - 1; right >= 1; right -= 2 {
		if right == 6 {
			right = 5
		}
		for vert := 0; vert < q.size; vert++ {
			for j := 0; j < 2; j++ {
				x := right - j
				upward := ((right + 1) & 2) == 0
				y := vert
				if upward {
					y = q.size - 1 - vert
				}
				if !q.function[y][x] && i < len(data)*8 {
					q.modules[y][x] = (data[i/8]>>(7-uint(i%8)))&1 == 1
					i++
				}
			}
		}
	}
}

func (q *qrBuilder) applyMask(mask int) {
	for y := 0; y < q.size; y++ {
		for x := 0; x < q.size; x++ {
			if q.function[y][x] {
				continue
			}
			var invert bool
			switch mask {
			case 0:
				invert = (x+y)%2 == 0
			case 1:
				invert = y%2 == 0
			case 2:
				invert = x%3 == 0
			case 3:
				invert = (x+y)%3 == 0
			case 4:
				invert = (x/3+y/2)%2 == 0
			case 5:
				invert = x*y%2+x*y%3 == 0
			case 6:
				invert = (x*y%2+x*y%3)%2 == 0
			case 7:
				invert = ((x+y)%2+x*y%3)%2 == 0
			}
			if invert {
				q.modules[y][x] = !q.modules[y][x]
			}
		}
	}
}

// penalty implements the four scoring rules of the specification.
func (q *qrBuilder) penalty() int {
	result := 0
	size := q.size
	get := func(x, y int, horizontal bool) bool {
		if horizontal {
			return q.modules[y][x]
		}
		return q.modules[x][y]
	}
	for _, horizontal := range []bool{true, false} {
		for a := 0; a < size; a++ {
			run := 1
			for b := 1; b < size; b++ {
				if get(b, a, horizontal) == get(b-1, a, horizontal) {
					run++
					if run == 5 {
						result += 3
					} else if run > 5 {
						result++
					}
				} else {
					run = 1
				}
			}
			// Finder-like patterns 1:1:3:1:1 with 4 light modules on a side.
			for b := 0; b+6 < size; b++ {
				if get(b, a, horizontal) && !get(b+1, a, horizontal) && get(b+2, a, horizontal) && get(b+3, a, horizontal) && get(b+4, a, horizontal) && !get(b+5, a, horizontal) && get(b+6, a, horizontal) {
					lightBefore, lightAfter := true, true
					for k := 1; k <= 4; k++ {
						if b-k >= 0 && get(b-k, a, horizontal) {
							lightBefore = false
						}
						if b+6+k < size && get(b+6+k, a, horizontal) {
							lightAfter = false
						}
					}
					if lightBefore || lightAfter {
						result += 40
					}
				}
			}
		}
	}
	dark := 0
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			if q.modules[y][x] {
				dark++
			}
			if x+1 < size && y+1 < size {
				c := q.modules[y][x]
				if c == q.modules[y][x+1] && c == q.modules[y+1][x] && c == q.modules[y+1][x+1] {
					result += 3
				}
			}
		}
	}
	total := size * size
	deviation := qrAbs(dark*20-total*10) / total // 5 % steps away from 50 %
	result += deviation * 10
	return result
}

func qrRSGenerator(degree int) []byte {
	result := make([]byte, degree)
	result[degree-1] = 1
	root := byte(1)
	for i := 0; i < degree; i++ {
		for j := 0; j < degree; j++ {
			result[j] = qrGFMultiply(result[j], root)
			if j+1 < degree {
				result[j] ^= result[j+1]
			}
		}
		root = qrGFMultiply(root, 0x02)
	}
	return result
}

func qrRSRemainder(data, generator []byte) []byte {
	result := make([]byte, len(generator))
	for _, b := range data {
		factor := b ^ result[0]
		copy(result, result[1:])
		result[len(result)-1] = 0
		for i := range result {
			result[i] ^= qrGFMultiply(generator[i], factor)
		}
	}
	return result
}

func qrGFMultiply(x, y byte) byte {
	z := 0
	for i := 7; i >= 0; i-- {
		z = (z << 1) ^ ((z >> 7) * 0x11D)
		z ^= int((y>>uint(i))&1) * int(x)
	}
	return byte(z)
}

func qrAbs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
