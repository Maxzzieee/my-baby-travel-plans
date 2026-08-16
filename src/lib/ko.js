// Make Kakao's Korean readable for non-Korean speakers.
// - romanize(): Revised-Romanization-ish transliteration so names are pronounceable
// - enCategory(): Kakao category -> plain English
// - enDistrict()/enPlaceLine(): tidy Seoul addresses into Latin script
// Korean is kept available elsewhere (for signboards / showing locals); this is
// purely the human-readable gloss.

const INI = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const MED = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
// finals as pronounced (single letter is plenty for legibility)
const FIN = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

export function romanize(str) {
  if (!str) return "";
  let out = "";
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const s = c - 0xac00;
      out += INI[Math.floor(s / (21 * 28))] + MED[Math.floor((s % (21 * 28)) / 28)] + FIN[s % 28];
    } else {
      out += ch;
    }
  }
  // Title-case each word, collapse whitespace
  return out.replace(/\s+/g, " ").trim().replace(/(^|[\s\-·])([a-z])/g, (_, p, l) => p + l.toUpperCase());
}

// The 25 Seoul districts — official spellings (romanize() alone misses assimilation).
const GU = {
  "종로구": "Jongno-gu", "중구": "Jung-gu", "용산구": "Yongsan-gu", "성동구": "Seongdong-gu",
  "광진구": "Gwangjin-gu", "동대문구": "Dongdaemun-gu", "중랑구": "Jungnang-gu", "성북구": "Seongbuk-gu",
  "강북구": "Gangbuk-gu", "도봉구": "Dobong-gu", "노원구": "Nowon-gu", "은평구": "Eunpyeong-gu",
  "서대문구": "Seodaemun-gu", "마포구": "Mapo-gu", "양천구": "Yangcheon-gu", "강서구": "Gangseo-gu",
  "구로구": "Guro-gu", "금천구": "Geumcheon-gu", "영등포구": "Yeongdeungpo-gu", "동작구": "Dongjak-gu",
  "관악구": "Gwanak-gu", "서초구": "Seocho-gu", "강남구": "Gangnam-gu", "송파구": "Songpa-gu", "강동구": "Gangdong-gu",
};
export function enDistrict(gu) { return gu ? (GU[gu] || romanize(gu)) : ""; }

// Kakao category (last segment of category_name) -> English. Falls back to romanize.
const CAT = {
  "도보여행": "Walking trail", "테마거리": "Theme street", "전망대": "Viewpoint", "먹자골목": "Food alley",
  "관광명소": "Attraction", "명소": "Attraction", "관광,명소": "Attraction", "공원": "Park", "산": "Mountain",
  "한식": "Korean food", "카페": "Café", "일식": "Japanese food", "중식": "Chinese food", "양식": "Western food",
  "아시아음식": "Asian food", "분식": "Snacks", "치킨": "Fried chicken", "패스트푸드": "Fast food",
  "고기": "BBQ / meat", "해물,생선": "Seafood", "술집": "Bar", "호프,요리주점": "Pub",
  "베이커리": "Bakery", "디저트": "Dessert", "떡,한과": "Rice cakes",
  "박물관": "Museum", "미술관": "Art museum", "문화,예술": "Culture / arts", "공연장,연극장": "Theatre",
  "영화,영상": "Cinema", "시장": "Market", "백화점": "Department store", "쇼핑몰": "Mall", "복합쇼핑몰": "Mall",
  "숙박": "Stay", "호텔": "Hotel", "게스트하우스": "Guesthouse", "종교,사찰": "Temple / shrine",
  "동물원": "Zoo", "아쿠아리움": "Aquarium", "놀이공원": "Amusement park", "찜질방": "Spa / jjimjilbang",
};
export function enCategory(cat) {
  if (!cat) return "";
  const last = String(cat).split(" > ").pop().trim();
  return CAT[last] || romanize(last);
}

// "서울 종로구 창신동 141-4" -> "Jongno-gu Changsindong 141-4" (Seoul dropped, gu fixed).
export function enPlaceLine(addr) {
  if (!addr) return "";
  let a = String(addr).replace(/^서울(특별시)?\s*/, "").trim();
  const gu = a.match(/([가-힣]+구)/);
  let head = "";
  if (gu) { head = enDistrict(gu[1]); a = a.replace(gu[1], "").trim(); } // keep gu's proper casing
  return [head, romanize(a)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export const hasHangul = (s) => /[가-힣]/.test(String(s || ""));
// Only transliterate strings that actually contain Korean — leaves your own
// English / casual titles ("steak got that tic tac toe") exactly as typed.
export function readable(str) {
  return hasHangul(str) ? romanize(str) : String(str || "");
}
