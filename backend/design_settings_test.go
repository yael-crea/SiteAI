package main

import (
 "encoding/json"
 "reflect"
 "testing"
)

func TestDesignOptionsJSONRoundTrip(t *testing.T) {
 var site GeneratedSite
 input := `{"designSettings":{"font":"modern","titleScale":"large","textScale":"comfortable","titleWeight":"bold","titleCase":"uppercase","lineHeight":"relaxed","cardRadius":"round","shadowStrength":"soft","imageRadius":"soft","imageRatio":"square","imageFit":"contain","buttonSize":"large","motion":"dynamic","heroBackground":"aurora"}}`
 if err:=json.Unmarshal([]byte(input), &site);err!=nil {t.Fatal(err)}
 s:=site.DesignSettings
 if s.TitleScale!="large" || s.TextScale!="comfortable" || s.TitleWeight!="bold" || s.TitleCase!="uppercase" || s.LineHeight!="relaxed" || s.CardRadius!="round" || s.ShadowStrength!="soft" || s.ImageRadius!="soft" || s.ImageRatio!="square" || s.ImageFit!="contain" || s.ButtonSize!="large" || s.Motion!="dynamic" || s.HeroBackground!="aurora" {t.Fatalf("options lost: %+v",s)}
 output,err:=json.Marshal(site);if err!=nil{t.Fatal(err)}
 var reread GeneratedSite
 if err=json.Unmarshal(output,&reread);err!=nil {t.Fatal(err)}
 if !reflect.DeepEqual(site.DesignSettings,reread.DesignSettings){t.Fatal("saved design changed")}
 var old GeneratedSite
 if err=json.Unmarshal([]byte(`{"designSettings":{"font":"system"}}`),&old);err!=nil{t.Fatal(err)}
 if old.DesignSettings.TitleScale!="" || old.DesignSettings.Font!="system" {t.Fatal("legacy design changed")}
}
