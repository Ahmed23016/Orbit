/**
 * Morning and evening adhkār. Short, widely narrated selections with their sources.
 * `morning`/`evening` hold the wording for each session where it differs.
 */

export type AdhkarSession = "morning" | "evening";

export type Dhikr = {
  id: string;
  title: string;
  arabic: string | Record<AdhkarSession, string>;
  meaning: string | Record<AdhkarSession, string>;
  repeat: number;
  source: string;
  sessions?: AdhkarSession[];
};

export const ADHKAR: Dhikr[] = [
  {
    id: "kursi",
    title: "Āyat al-Kursī",
    arabic:
      "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    meaning:
      "Allah — there is no god but He, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him… His Throne extends over the heavens and the earth, and guarding them does not tire Him. He is the Most High, the Most Great.",
    repeat: 1,
    source: "al-Baqarah 2:255 · an-Nasāʾī, al-Ḥākim",
  },
  {
    id: "quls",
    title: "al-Ikhlāṣ, al-Falaq & an-Nās",
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ · قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ · قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
    meaning: "Recite the last three sūrahs of the Qurʾān in full, three times each.",
    repeat: 3,
    source: "Abū Dāwūd, at-Tirmidhī",
  },
  {
    id: "mulk",
    title: "Dominion belongs to Allah",
    arabic: {
      morning:
        "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      evening:
        "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    },
    meaning: {
      morning:
        "We have entered the morning and the dominion belongs to Allah. Praise is for Allah; there is no god but Allah alone, without partner. His is the dominion and His the praise, and He has power over all things.",
      evening:
        "We have entered the evening and the dominion belongs to Allah. Praise is for Allah; there is no god but Allah alone, without partner. His is the dominion and His the praise, and He has power over all things.",
    },
    repeat: 1,
    source: "Muslim",
  },
  {
    id: "bika",
    title: "By You we live",
    arabic: {
      morning:
        "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
      evening:
        "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
    },
    meaning: {
      morning:
        "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
      evening:
        "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return.",
    },
    repeat: 1,
    source: "at-Tirmidhī, Abū Dāwūd",
  },
  {
    id: "sayyid",
    title: "Sayyid al-Istighfār",
    arabic:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    meaning:
      "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins but You.",
    repeat: 1,
    source: "al-Bukhārī",
  },
  {
    id: "bismillah",
    title: "Protection by His Name",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ",
    meaning:
      "In the name of Allah, with whose Name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.",
    repeat: 3,
    source: "Abū Dāwūd, at-Tirmidhī",
  },
  {
    id: "radina",
    title: "Contentment",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
    meaning: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.",
    repeat: 3,
    source: "Abū Dāwūd",
  },
  {
    id: "hasbiya",
    title: "Allah is sufficient for me",
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    meaning:
      "Allah is sufficient for me; there is no god but He. In Him I put my trust, and He is the Lord of the Mighty Throne.",
    repeat: 7,
    source: "Abū Dāwūd",
  },
  {
    id: "audhu",
    title: "Refuge in His perfect words",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    meaning: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    repeat: 3,
    source: "Muslim",
    sessions: ["evening"],
  },
  {
    id: "subhan100",
    title: "Glory and praise",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    meaning: "Glory be to Allah, and praise be to Him.",
    repeat: 100,
    source: "Muslim",
  },
];

export function adhkarFor(session: AdhkarSession) {
  return ADHKAR.filter((item) => !item.sessions || item.sessions.includes(session)).map((item) => ({
    ...item,
    arabic: typeof item.arabic === "string" ? item.arabic : item.arabic[session],
    meaning: typeof item.meaning === "string" ? item.meaning : item.meaning[session],
  }));
}

/** Morning adhkār run from Fajr until Asr, evening ones from Asr through the night. */
export function defaultAdhkarSession(now: Date, fajr: Date, asr: Date): AdhkarSession {
  const t = now.getTime();
  return t >= fajr.getTime() && t < asr.getTime() ? "morning" : "evening";
}
