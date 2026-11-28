// Every word on the home page and the marketing pages, in English and Hindi. Both languages are
// rendered into the HTML; the head script picks one before first paint, so the toggle never flashes.
// The Hindi needs a native speaker's review before launch.

export interface Bi {
  en: string;
  hi: string;
}

export const ACTIONS = {
  demo: { en: "Try the demo desk", hi: "डेमो डेस्क आज़माएँ" },
  start: { en: "Start for my gym", hi: "मेरे जिम के लिए शुरू करें" },
  how: { en: "How it works", hi: "यह कैसे काम करता है" },
  pricing: { en: "Pricing", hi: "क़ीमत" },
  signIn: { en: "Sign in", hi: "साइन इन" },
  home: { en: "Home", hi: "होम" },
  menu: { en: "Menu", hi: "मेन्यू" },
  close: { en: "Close", hi: "बंद करें" },
  lessMotion: { en: "Less motion", hi: "कम हलचल" },
  fullDemo: { en: "Do this in the full demo desk", hi: "पूरे डेमो डेस्क में यही करें" },
  seeHow: { en: "See how it works", hi: "देखें कैसे काम करता है" },
  tryIt: { en: "Try it:", hi: "आज़माएँ:" },
  stopOf: { en: "Stop {n} of 7", hi: "7 में से पड़ाव {n}" },
} satisfies Record<string, Bi>;

export const HERO = {
  time: "5:58 AM",
  h1: { en: "Khatabar is the front desk app for your gym.", hi: "खाताबार आपके जिम का फ्रंट डेस्क ऐप है।" },
  sub: {
    en: "Your paper register is slow when ten members arrive at 6 am. Khatabar finds any member in 2 seconds, takes the fee in cash or UPI, and sends the WhatsApp reminder.",
    hi: "सुबह 6 बजे दस मेंबर एक साथ आएँ तो कागज़ का रजिस्टर धीमा पड़ जाता है। खाताबार फ़ोन के आख़िरी 4 अंक से किसी भी मेंबर को 2 सेकंड में ढूँढता है, फ़ीस कैश या UPI में लेता है, और WhatsApp रिमाइंडर भेजता है।",
  },
  who: {
    en: "For gym owners and front desk staff in India. Free for one branch, up to 75 active members.",
    hi: "भारत के जिम मालिकों और फ्रंट डेस्क स्टाफ़ के लिए। एक ब्रांच और 75 एक्टिव मेंबर तक मुफ़्त।",
  },
} as const;

export interface SceneCopy {
  n: number;
  id: string;
  time: string;
  stop: Bi;
  h2: Bi;
  problem: Bi;
  try: Bi;
  demo?: string;
}

export const SCENES: SceneCopy[] = [
  {
    n: 1,
    id: "top",
    time: "5:58",
    stop: { en: "Shutter up", hi: "शटर ऊपर" },
    h2: HERO.h1,
    problem: HERO.sub,
    try: { en: "", hi: "" },
  },
  {
    n: 2,
    id: "how",
    time: "6:02",
    stop: { en: "Find and renew", hi: "ढूँढें और रिन्यू करें" },
    h2: { en: "Find a member. Renew. Done.", hi: "मेंबर ढूँढें। रिन्यू करें। हो गया।" },
    problem: {
      en: "At 6 am nobody can flip through a register while a queue waits. Type the last 4 digits of the phone and the member's card comes up.",
      hi: "सुबह 6 बजे लाइन लगी हो तो कोई रजिस्टर के पन्ने नहीं पलट सकता। फ़ोन के आख़िरी 4 अंक लिखिए, मेंबर का कार्ड सामने आ जाएगा।",
    },
    try: { en: "Type 4521, or tap the chip. Then press Renew.", hi: "4521 लिखें या चिप दबाएँ। फिर रिन्यू दबाएँ।" },
    demo: "/demo/desk",
  },
  {
    n: 3,
    id: "fees",
    time: "6:15",
    stop: { en: "Fees due", hi: "बाकी फ़ीस" },
    h2: { en: "Fees due? Send a polite WhatsApp.", hi: "फ़ीस बाकी? विनम्र WhatsApp भेजिए।" },
    problem: {
      en: "Asking for fees face to face is awkward. Khatabar writes the polite message for you; you only press Send.",
      hi: "आमने-सामने फ़ीस माँगना अटपटा लगता है। खाताबार आपके लिए विनम्र संदेश लिख देता है; आपको बस भेजना दबाना है।",
    },
    try: { en: "Tap Send reminder on any chit.", hi: "किसी भी पर्ची पर रिमाइंडर भेजें दबाएँ।" },
    demo: "/demo/fees",
  },
  {
    n: 4,
    id: "freeze",
    time: "6:30",
    stop: { en: "Freeze", hi: "फ़्रीज़" },
    h2: { en: "Going away? Freeze it, don't fight over it.", hi: "बाहर जा रहे हैं? फ़्रीज़ कीजिए, बहस नहीं।" },
    problem: {
      en: "When a member travels or has exams, freeze the membership. The end date moves forward, so nobody argues about it later.",
      hi: "मेंबर बाहर जाए या परीक्षा हो, तो मेंबरशिप फ़्रीज़ कर दीजिए। ख़त्म होने की तारीख़ आगे खिसक जाती है, बाद में कोई बहस नहीं होती।",
    },
    try: { en: "Omkar asked for 10 days off for exams. Tap Approve.", hi: "ओंकार ने परीक्षा के लिए 10 दिन की छुट्टी माँगी है। मंज़ूर करें दबाएँ।" },
    demo: "/demo/freeze",
  },
  {
    n: 5,
    id: "card",
    time: "6:45",
    stop: { en: "Member card", hi: "मेंबर कार्ड" },
    h2: { en: "Every member carries their card on their phone.", hi: "हर मेंबर का कार्ड उसके फ़ोन में।" },
    problem: {
      en: "Members keep asking the desk 'kab tak hai?'. Their phone card shows the end date, the pay link and the QR, so they stop asking.",
      hi: "मेंबर बार-बार पूछते हैं 'कब तक है?'। उनके फ़ोन कार्ड पर ख़त्म होने की तारीख़, पेमेंट लिंक और QR रहता है, तो पूछना बंद।",
    },
    try: { en: "This is Mahesh's card. Switch to हिंदी, or tap Check in Mahesh.", hi: "यह महेश का कार्ड है। English चुनें, या महेश की हाज़िरी लगाएँ दबाएँ।" },
    demo: "/demo/m/LP-0042",
  },
  {
    n: 6,
    id: "report",
    time: "10:30",
    stop: { en: "Close the day and report", hi: "दिन बंद और रिपोर्ट" },
    h2: { en: "Count the drawer at night. Read the report at 6 am.", hi: "रात को गल्ला गिनिए। सुबह 6 बजे रिपोर्ट पढ़िए।" },
    problem: {
      en: "Cash goes missing quietly. At closing, count the drawer against what the app expects. At 6 am the owner sees yesterday's money and who is leaving, without calling the desk.",
      hi: "कैश चुपचाप कम हो जाता है। बंद करते समय गल्ला गिनिए और ऐप के हिसाब से मिलाइए। सुबह 6 बजे मालिक बिना फ़ोन किए कल की कमाई और जाने वाले मेंबर देख लेते हैं।",
    },
    try: { en: "Count the drawer, then open Meena's morning report.", hi: "गल्ला गिनिए, फिर मीना जी की सुबह की रिपोर्ट खोलिए।" },
    demo: "/demo/report",
  },
  {
    n: 7,
    id: "import",
    time: "7:30",
    stop: { en: "Bring your members", hi: "अपने मेंबर लाएँ" },
    h2: { en: "Already have members in Excel? Bring them in.", hi: "मेंबर Excel में हैं? उन्हें ले आइए।" },
    problem: {
      en: "Typing 200 members again takes days. Drop your Excel or Google Sheet and Khatabar finds the names, phones and end dates.",
      hi: "200 मेंबर दोबारा टाइप करने में कई दिन लगते हैं। अपनी Excel या Google Sheet डालिए, खाताबार नाम, फ़ोन और ख़त्म होने की तारीख़ ढूँढ लेता है।",
    },
    try: { en: "Tap 'Try a messy sample sheet'.", hi: "'गड़बड़ सैंपल शीट आज़माएँ' दबाएँ।" },
    demo: "/demo/import",
  },
];

/** The clock at each stop. The street runs from dawn to night and on to the next morning, so
 *  every time says am or pm, and the last stop says it is the next day. */
export const STOP_TIMES = ["5:58 am", "6:02 am", "6:15 am", "6:30 am", "6:45 am", "10:30 pm", "7:30 am"];
export const STOP_NOTE: (Bi | null)[] = [null, null, null, null, null, { en: "night", hi: "रात" }, { en: "next day", hi: "अगला दिन" }];

export const RATES = {
  title: "RATES",
  free: { en: "Free: 1 branch, up to 75 active members, every feature included.", hi: "मुफ़्त: 1 ब्रांच, 75 एक्टिव मेंबर तक, हर फ़ीचर शामिल।" },
  more: {
    en: "More members or more branches: the price is not set yet. We are asking gym owners first, and nothing is ever charged without asking you.",
    hi: "ज़्यादा मेंबर या ज़्यादा ब्रांच: क़ीमत अभी तय नहीं है। हम पहले जिम मालिकों से पूछ रहे हैं, और आपसे पूछे बिना कभी कुछ नहीं लिया जाएगा।",
  },
  link: { en: "Pricing details", hi: "क़ीमत की पूरी जानकारी" },
};

export const FINALE = {
  h2: { en: "Open your gym's front desk today.", hi: "आज ही अपने जिम का फ्रंट डेस्क खोलिए।" },
  line: { en: "No card needed. Free for one branch, up to 75 active members.", hi: "कोई कार्ड नहीं चाहिए। एक ब्रांच और 75 एक्टिव मेंबर तक मुफ़्त।" },
};

export const FOOTER = {
  line: { en: "Khatabar: the front desk app for Indian gyms. The demo gym is made up.", hi: "खाताबार: भारतीय जिमों का फ्रंट डेस्क ऐप। डेमो जिम काल्पनिक है।" },
};
