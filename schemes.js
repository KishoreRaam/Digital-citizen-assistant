// Hardcoded scheme catalogue — the ONLY schemes the app is allowed to recommend.
// Used both by the serverless function (as the model's closed context) and by
// the local fallback matcher (keyword rules) when no backend is reachable.
"use strict";

const SCHEMES = [
  {
    id: "pm-kisan",
    name: "PM-KISAN",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "₹6,000", period: { en: "/ year", ta: "/ ஆண்டு", hi: "/ वर्ष" } },
    category: "farmer",
    keywords: ["farmer","farming","crop","acre","paddy","agricultur","cultivat","field","land","harvest",
      "விவசாயி","விவசாயம்","பயிர்","ஏக்கர்","நெல்","சாகுபடி","நிலம்",
      "किसान","खेत","फसल","एकड़","खेती","धान"],
    reasons: {
      en: () => "You describe yourself as a small or marginal farmer cultivating your own land. PM-KISAN gives every landholding farmer family direct income support of ₹6,000 a year, paid in three equal instalments straight into your bank account — no middleman, no application fee. Since you mention working your own field, this is one of the most direct schemes available to you.",
      ta: () => "நீங்கள் உங்கள் சொந்த நிலத்தில் பயிரிடும் சிறு/குறு விவசாயி என்று குறிப்பிட்டுள்ளீர்கள். நிலம் வைத்திருக்கும் ஒவ்வொரு விவசாயக் குடும்பத்திற்கும் PM-KISAN திட்டம் ஆண்டுக்கு ₹6,000 நேரடி வருமான உதவியை மூன்று சம தவணைகளாக உங்கள் வங்கிக் கணக்கில் நேரடியாக வழங்குகிறது — இடைத்தரகர் இல்லை, கட்டணமும் இல்லை. நீங்கள் உங்கள் சொந்த நிலத்தில் பயிரிடுவதாகக் கூறியுள்ளதால், இது உங்களுக்குப் பொருந்தும் மிக நேரடியான திட்டங்களில் ஒன்று.",
      hi: () => "आपने बताया है कि आप अपनी ज़मीन पर खेती करने वाले छोटे या सीमांत किसान हैं। PM-KISAN योजना हर ज़मीन-मालिक किसान परिवार को साल में ₹6,000 की सीधी आय सहायता देती है, जो तीन बराबर किस्तों में सीधे आपके बैंक खाते में आती है — किसी बिचौलिए या शुल्क की ज़रूरत नहीं। चूँकि आप अपनी ज़मीन पर खेती कर रहे हैं, यह आपके लिए सबसे सीधी योजनाओं में से एक है।",
    },
    apply: {
      en: ["Land ownership record (khatauni/patta) in your name", "Aadhaar-linked bank account"],
      ta: ["உங்கள் பெயரில் நில உரிமை ஆவணம் (பட்டா)", "Aadhaar இணைக்கப்பட்ட வங்கிக் கணக்கு"],
      hi: ["आपके नाम पर ज़मीन का मालिकाना दस्तावेज़ (पट्टा)", "आधार से जुड़ा बैंक खाता"],
    },
    nextStep: {
      en: "Apply at pmkisan.gov.in or your nearest Common Service Centre",
      ta: "pmkisan.gov.in அல்லது அருகிலுள்ள Common Service Centre-இல் விண்ணப்பிக்கவும்",
      hi: "pmkisan.gov.in या नज़दीकी कॉमन सर्विस सेंटर पर आवेदन करें",
    },
  },
  {
    id: "fasal-bima",
    name: "Pradhan Mantri Fasal Bima Yojana",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: null,
    category: "farmer",
    keywords: ["crop fail","crop loss","drought","rain","flood","paddy","harvest lost","yield lost",
      "பயிர் இழப்பு","வறட்சி","மழையின்றி","பாதிக்கப்பட்ட","பயிர் பாதிப்பு",
      "फसल खराब","सूखा","बारिश नहीं","फसल नुकसान"],
    reasons: {
      en: () => "You mention your crop was damaged this year due to poor rainfall or drought. Fasal Bima Yojana insures exactly this situation — if your notified crop fails due to weather (drought, flood, or unseasonal rain), you receive a payout based on the assessed loss. You will need your land record (patta) and sowing details at the time of claim; premiums for food-grain crops are very low, capped at 2% of the sum insured.",
      ta: () => "இந்த ஆண்டு போதிய மழை இல்லாததால் அல்லது வறட்சியால் உங்கள் பயிர் பாதிக்கப்பட்டதாகக் குறிப்பிட்டுள்ளீர்கள். Fasal Bima Yojana திட்டம் இதே சூழலுக்கு காப்பீடு அளிக்கிறது — அறிவிக்கப்பட்ட பயிர் வானிலை காரணமாக (வறட்சி, வெள்ளம், பருவமற்ற மழை) பாதிக்கப்பட்டால், மதிப்பிடப்பட்ட இழப்பின் அடிப்படையில் நஷ்டஈடு கிடைக்கும். உரிமைகோரும்போது உங்கள் பட்டா மற்றும் விதைப்பு விவரங்கள் தேவைப்படும்; உணவுத் தானியப் பயிர்களுக்கான பிரீமியம் மிகக் குறைவு, காப்பீட்டுத் தொகையில் 2% வரை மட்டுமே.",
      hi: () => "आपने बताया है कि इस साल कम बारिश या सूखे की वजह से आपकी फसल को नुकसान हुआ है। Fasal Bima Yojana ठीक इसी स्थिति के लिए बीमा देती है — अगर अधिसूचित फसल मौसम की वजह से (सूखा, बाढ़, बेमौसम बारिश) खराब होती है, तो आंके गए नुकसान के आधार पर भुगतान मिलता है। दावा करते समय आपको अपनी ज़मीन का पट्टा और बुवाई का विवरण देना होगा; अनाज की फसलों का प्रीमियम बहुत कम है, बीमा राशि का अधिकतम 2%।",
    },
    apply: {
      en: ["Land record (patta) and sowing declaration", "Aadhaar and bank passbook copy"],
      ta: ["நில ஆவணம் (பட்டா) மற்றும் விதைப்பு அறிவிப்பு", "Aadhaar மற்றும் வங்கி பாஸ்புக் நகல்"],
      hi: ["ज़मीन का पट्टा और बुवाई घोषणा", "आधार और बैंक पासबुक की प्रति"],
    },
    benefit: {
      en: "Insurance payout based on assessed crop loss due to weather, at very low premium",
      ta: "வானிலை காரணமாக மதிப்பிடப்பட்ட பயிர் இழப்பின் அடிப்படையில் காப்பீட்டுத் தொகை, மிகக் குறைந்த பிரீமியத்தில்",
      hi: "मौसम की वजह से आंके गए फसल नुकसान के आधार पर बीमा भुगतान, बहुत कम प्रीमियम पर",
    },
    nextStep: {
      en: "Apply through your bank, CSC, or pmfby.gov.in",
      ta: "உங்கள் வங்கி, CSC அல்லது pmfby.gov.in மூலம் விண்ணப்பிக்கவும்",
      hi: "अपने बैंक, CSC या pmfby.gov.in के ज़रिए आवेदन करें",
    },
  },
  {
    id: "kcc",
    name: "Kisan Credit Card",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: null,
    category: "farmer",
    keywords: ["loan","credit","farmer","land record","patta","விவசாயி","கடன்","பட்டா","किसान","कर्ज़","ऋण"],
    reasons: {
      en: () => "As a farmer with your own land record, you can use the Kisan Credit Card to borrow for seeds, fertiliser, and other cultivation costs at a subsidised interest rate (as low as 4% with timely repayment). This helps you avoid high-interest informal moneylenders, especially useful after a loss year like this one.",
      ta: () => "உங்கள் சொந்த நில உரிமையுடன் ஒரு விவசாயியாக, விதை, உரம் மற்றும் பிற சாகுபடிச் செலவுகளுக்காக Kisan Credit Card மூலம் மானியம் பெற்ற வட்டி விகிதத்தில் (சரியான நேரத்தில் திருப்பிச் செலுத்தினால் 4% வரை குறைவு) கடன் பெறலாம். இது அதிக வட்டி வசூலிக்கும் தனியார் கடன் வழங்குநர்களைத் தவிர்க்க உதவும், குறிப்பாக இழப்பு ஏற்பட்ட இந்த ஆண்டில்.",
      hi: () => "अपनी ज़मीन के रिकॉर्ड वाले किसान होने के नाते, आप Kisan Credit Card से बीज, खाद और खेती के अन्य खर्चों के लिए सब्सिडी वाली ब्याज दर पर (समय पर चुकाने पर 4% तक कम) कर्ज़ ले सकते हैं। इससे ऊँची ब्याज दर वाले साहूकारों से बचा जा सकता है, खासकर इस साल के नुकसान के बाद।",
    },
    apply: {
      en: ["Land ownership document", "Aadhaar and a photo ID (PAN/voter ID)"],
      ta: ["நில உரிமை ஆவணம்", "Aadhaar மற்றும் புகைப்பட அடையாள அட்டை (PAN/வாக்காளர் அட்டை)"],
      hi: ["ज़मीन का मालिकाना दस्तावेज़", "आधार और फोटो पहचान पत्र (पैन/वोटर आईडी)"],
    },
    benefit: {
      en: "Short-term crop loan at subsidised interest, as low as 4% with timely repayment",
      ta: "மானியம் பெற்ற வட்டியில் குறுகிய கால சாகுபடிக் கடன், சரியான நேரத்தில் திருப்பிச் செலுத்தினால் 4% வரை குறைவு",
      hi: "सब्सिडी वाली ब्याज दर पर अल्पकालीन फसल ऋण, समय पर चुकाने पर 4% तक कम",
    },
    nextStep: {
      en: "Apply at any nationalised or cooperative bank branch",
      ta: "எந்த தேசியமயமாக்கப்பட்ட அல்லது கூட்டுறவு வங்கிக் கிளையிலும் விண்ணப்பிக்கவும்",
      hi: "किसी भी राष्ट्रीयकृत या सहकारी बैंक शाखा में आवेदन करें",
    },
  },
  {
    id: "mgnrega",
    name: "MGNREGA",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "100 days", period: { en: "/ year guaranteed work", ta: "/ ஆண்டு உறுதி வேலை", hi: "/ वर्ष गारंटी काम" } },
    category: "employment",
    keywords: ["daily wage","no work","unemployed","labour","labourer","job","work","வேலையில்லை","கூலி","தினக்கூலி","रोज़गार नहीं","मज़दूर","बेरोज़गार","काम नहीं"],
    reasons: {
      en: () => "You describe a period without steady income or work. Any rural household is entitled to register for MGNREGA and get up to 100 days of guaranteed manual work per year at the notified minimum wage, paid directly to a bank account. This is especially relevant between farming seasons or after a crop loss.",
      ta: () => "நிலையான வருமானம் அல்லது வேலை இல்லாத காலத்தைக் குறிப்பிட்டுள்ளீர்கள். எந்தவொரு கிராமப்புற குடும்பமும் MGNREGA திட்டத்தில் பதிவு செய்து ஆண்டுக்கு 100 நாட்கள் வரை உறுதியான கூலி வேலையை அறிவிக்கப்பட்ட குறைந்தபட்ச கூலியில் பெறலாம், நேரடியாக வங்கிக் கணக்கில் செலுத்தப்படும். சாகுபடிக் காலங்களுக்கு இடையே அல்லது பயிர் இழப்புக்குப் பிறகு இது மிகவும் பொருத்தமானது.",
      hi: () => "आपने बिना स्थिर आय या काम के समय का ज़िक्र किया है। कोई भी ग्रामीण परिवार MGNREGA में पंजीकरण करके साल में 100 दिन तक गारंटीशुदा मज़दूरी वाला काम, अधिसूचित न्यूनतम मज़दूरी पर, सीधे बैंक खाते में पा सकता है। यह खेती के सीज़न के बीच या फसल नुकसान के बाद विशेष रूप से उपयोगी है।",
    },
    apply: {
      en: ["Aadhaar card", "Job card registration at your Gram Panchayat"],
      ta: ["Aadhaar அட்டை", "உங்கள் கிராம பஞ்சாயத்தில் ஜாப் கார்டு பதிவு"],
      hi: ["आधार कार्ड", "अपनी ग्राम पंचायत में जॉब कार्ड पंजीकरण"],
    },
    nextStep: {
      en: "Register at your Gram Panchayat office",
      ta: "உங்கள் கிராம பஞ்சாயத்து அலுவலகத்தில் பதிவு செய்யவும்",
      hi: "अपने ग्राम पंचायत कार्यालय में पंजीकरण करें",
    },
  },
  {
    id: "pmay-g",
    name: "Pradhan Mantri Awas Yojana – Gramin",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "₹1,20,000", period: { en: "one-time (plain area)", ta: "ஒருமுறை (சமவெளி)", hi: "एकमुश्त (मैदानी क्षेत्र)" } },
    category: "housing",
    keywords: ["no house","hut","kutcha","roof","homeless","house damaged","வீடு இல்லை","குடிசை","ஓட்டு வீடு","கூரை","घर नहीं","कच्चा मकान","झोपड़ी"],
    reasons: {
      en: () => "You mention not having a proper pucca house. PMAY-Gramin gives eligible rural households without a solid house financial assistance of about ₹1.2 lakh (₹1.3 lakh in hilly/difficult areas) to build one, along with support for a toilet and job-card wages during construction.",
      ta: () => "முழுமையான பக்கா வீடு இல்லை என்று குறிப்பிட்டுள்ளீர்கள். PMAY-Gramin திட்டம் திடமான வீடு இல்லாத தகுதியான கிராமப்புற குடும்பங்களுக்கு சுமார் ₹1.2 லட்சம் (மலைப்பாங்கான/சிரமமான பகுதிகளில் ₹1.3 லட்சம்) நிதி உதவியை வீடு கட்ட வழங்குகிறது, மேலும் கழிப்பறை மற்றும் கட்டுமான காலத்தில் கூலி வேலை உதவியும் கிடைக்கும்.",
      hi: () => "आपने बताया है कि आपके पास पक्का मकान नहीं है। PMAY-ग्रामीण उन पात्र ग्रामीण परिवारों को जिनके पास ठोस मकान नहीं है, लगभग ₹1.2 लाख (पहाड़ी/कठिन क्षेत्रों में ₹1.3 लाख) की सहायता मकान बनाने के लिए देती है, साथ ही शौचालय और निर्माण के दौरान मज़दूरी की सहायता भी।",
    },
    apply: {
      en: ["Aadhaar card", "Proof of no pucca house (Gram Sabha verification)"],
      ta: ["Aadhaar அட்டை", "பக்கா வீடு இல்லை என்பதற்கான ஆதாரம் (கிராம சபை சரிபார்ப்பு)"],
      hi: ["आधार कार्ड", "पक्का मकान न होने का प्रमाण (ग्राम सभा सत्यापन)"],
    },
    nextStep: {
      en: "Apply through your Gram Panchayat or Block Development Office",
      ta: "உங்கள் கிராம பஞ்சாயத்து அல்லது வட்டாரமேம்பாட்டு அலுவலகம் மூலம் விண்ணப்பிக்கவும்",
      hi: "अपने ग्राम पंचायत या ब्लॉक विकास कार्यालय के ज़रिए आवेदन करें",
    },
  },
  {
    id: "old-age-pension",
    name: "Indira Gandhi National Old Age Pension (with TN top-up)",
    agency: { en: "Central + Tamil Nadu Government", ta: "மத்திய + தமிழ்நாடு அரசு", hi: "केंद्र + तमिलनाडु सरकार" },
    amount: { value: "₹1,000+", period: { en: "/ month", ta: "/ மாதம்", hi: "/ महीना" } },
    category: "elderly",
    keywords: ["old","elderly","60 years","senior citizen","aged parent","முதியவர்","வயதானவர்","60 வயது","वृद्ध","बुज़ुर्ग","60 साल"],
    reasons: {
      en: () => "You mention being, or caring for, someone aged 60 or above without regular income. Old-age pension gives a monthly amount (₹1,000 from the centre, topped up further by the Tamil Nadu government) directly into the beneficiary's bank or post-office account, no repeat application needed once approved.",
      ta: () => "நிலையான வருமானம் இல்லாத 60 வயது அல்லது அதற்கு மேற்பட்ட ஒருவரைப் பற்றி அல்லது நீங்களே அவ்வயதில் இருப்பதாகக் குறிப்பிட்டுள்ளீர்கள். முதியோர் ஓய்வூதியம் மாதந்தோறும் ஒரு தொகையை (மத்திய அரசிடமிருந்து ₹1,000, தமிழ்நாடு அரசால் மேலும் கூடுதலாக) நேரடியாக பயனாளியின் வங்கி அல்லது தபால் கணக்கில் வழங்குகிறது, ஒப்புதல் கிடைத்தபின் மீண்டும் விண்ணப்பிக்க தேவையில்லை.",
      hi: () => "आपने बताया है कि आप, या आपके परिवार में कोई, 60 वर्ष या उससे अधिक उम्र के हैं और नियमित आय नहीं है। वृद्धावस्था पेंशन हर महीने एक राशि (केंद्र से ₹1,000, तमिलनाडु सरकार द्वारा और बढ़ाई गई) सीधे लाभार्थी के बैंक या डाकघर खाते में देती है, स्वीकृति के बाद बार-बार आवेदन की ज़रूरत नहीं।",
    },
    apply: {
      en: ["Age proof showing 60 years or above", "Income certificate showing no regular income"],
      ta: ["60 வயது அல்லது அதற்கு மேற்பட்டதற்கான வயது ஆதாரம்", "நிலையான வருமானம் இல்லை என்பதற்கான வருமான சான்று"],
      hi: ["60 वर्ष या उससे अधिक का आयु प्रमाण", "नियमित आय न होने का आय प्रमाण पत्र"],
    },
    nextStep: {
      en: "Apply at your Taluk Social Welfare Office",
      ta: "உங்கள் வட்ட சமூக நல அலுவலகத்தில் விண்ணப்பிக்கவும்",
      hi: "अपने तालुक समाज कल्याण कार्यालय में आवेदन करें",
    },
  },
  {
    id: "tn-widow-pension",
    name: "Tamil Nadu Destitute Widow Pension Scheme",
    agency: { en: "Tamil Nadu Government", ta: "தமிழ்நாடு அரசு", hi: "तमिलनाडु सरकार" },
    amount: { value: "₹1,000", period: { en: "/ month", ta: "/ மாதம்", hi: "/ महीना" } },
    category: "widow",
    keywords: ["widow","husband died","husband passed","விதவை","கணவர் இறந்து","கணவர் மரணம்","विधवा","पति की मृत्यु","पति गुज़र गए"],
    reasons: {
      en: () => "You mention having lost your husband and having no regular income. The Tamil Nadu Destitute Widow Pension Scheme gives ₹1,000 a month to widows without adequate means of support, paid directly to your account with no age limit for the pension itself.",
      ta: () => "உங்கள் கணவர் இறந்துவிட்டதாகவும், நிலையான வருமானம் இல்லை எனவும் குறிப்பிட்டுள்ளீர்கள். தமிழ்நாடு தவிக்கும் விதவைப் பென்ஷன் திட்டம் போதிய ஆதரவு இல்லாத விதவைகளுக்கு மாதம் ₹1,000 வழங்குகிறது, நேரடியாக உங்கள் கணக்கில் செலுத்தப்படும், பென்ஷனுக்கு வயது வரம்பு இல்லை.",
      hi: () => "आपने बताया है कि आपके पति का निधन हो गया है और आपके पास नियमित आय नहीं है। तमिलनाडु निराश्रित विधवा पेंशन योजना ऐसी विधवाओं को हर महीने ₹1,000 देती है जिनके पास पर्याप्त सहारा नहीं है, यह सीधे आपके खाते में जाता है और पेंशन के लिए कोई आयु सीमा नहीं है।",
    },
    apply: {
      en: ["Husband's death certificate", "Aadhaar and income certificate"],
      ta: ["கணவரின் இறப்புச் சான்றிதழ்", "Aadhaar மற்றும் வருமான சான்று"],
      hi: ["पति का मृत्यु प्रमाण पत्र", "आधार और आय प्रमाण पत्र"],
    },
    nextStep: {
      en: "Apply at your Taluk Social Welfare Office",
      ta: "உங்கள் வட்ட சமூக நல அலுவலகத்தில் விண்ணப்பிக்கவும்",
      hi: "अपने तालुक समाज कल्याण कार्यालय में आवेदन करें",
    },
  },
  {
    id: "tn-disability-pension",
    name: "Tamil Nadu Differently Abled Pension Scheme",
    agency: { en: "Tamil Nadu Government", ta: "தமிழ்நாடு அரசு", hi: "तमिलनाडु सरकार" },
    amount: { value: "₹1,000", period: { en: "/ month", ta: "/ மாதம்", hi: "/ महीना" } },
    category: "disability",
    keywords: ["disab","handicap","blind","physically challenged","மாற்றுத்திறனாளி","ஊனமுற்ற","பார்வையற்ற","विकलांग","दिव्यांग"],
    reasons: {
      en: () => "You mention a physical disability affecting your ability to work. The Tamil Nadu Differently Abled Pension Scheme gives ₹1,000 a month to persons with 40% or more disability and no other regular income, deposited directly to your bank account each month.",
      ta: () => "வேலை செய்யும் திறனைப் பாதிக்கும் உடல் ஊனத்தைக் குறிப்பிட்டுள்ளீர்கள். தமிழ்நாடு மாற்றுத்திறனாளிகள் ஓய்வூதியத் திட்டம் 40% அல்லது அதற்கு மேற்பட்ட ஊனமும் வேறு நிலையான வருமானமும் இல்லாதவர்களுக்கு மாதம் ₹1,000 வழங்குகிறது, ஒவ்வொரு மாதமும் நேரடியாக வங்கிக் கணக்கில் செலுத்தப்படும்.",
      hi: () => "आपने अपनी कार्य क्षमता को प्रभावित करने वाली शारीरिक विकलांगता का ज़िक्र किया है। तमिलनाडु दिव्यांग पेंशन योजना 40% या उससे अधिक विकलांगता वाले और अन्य नियमित आय न रखने वाले व्यक्तियों को हर महीने ₹1,000 देती है, जो सीधे आपके बैंक खाते में जमा होता है।",
    },
    apply: {
      en: ["Disability certificate (40% or more)", "Aadhaar and income certificate"],
      ta: ["ஊனச் சான்றிதழ் (40% அல்லது அதற்கு மேல்)", "Aadhaar மற்றும் வருமான சான்று"],
      hi: ["विकलांगता प्रमाण पत्र (40% या अधिक)", "आधार और आय प्रमाण पत्र"],
    },
    nextStep: {
      en: "Apply at your Taluk Social Welfare Office",
      ta: "உங்கள் வட்ட சமூக நல அலுவலகத்தில் விண்ணப்பிக்கவும்",
      hi: "अपने तालुक समाज कल्याण कार्यालय में आवेदन करें",
    },
  },
  {
    id: "cmchis",
    name: "Chief Minister's Comprehensive Health Insurance Scheme",
    agency: { en: "Tamil Nadu Government", ta: "தமிழ்நாடு அரசு", hi: "तमिलनाडु सरकार" },
    amount: { value: "₹5,00,000", period: { en: "/ family / year (treatment cover)", ta: "/ குடும்பம் / ஆண்டு (சிகிச்சை)", hi: "/ परिवार / वर्ष (इलाज कवर)" } },
    category: "health",
    keywords: ["hospital","surgery","medical","sick","illness","treatment","மருத்துவமனை","அறுவை சிகிச்சை","நோய்","चिकित्सा","अस्पताल","बीमारी","इलाज"],
    reasons: {
      en: () => "You mention a medical or hospitalisation need. CMCHIS covers cashless treatment up to ₹5 lakh per family per year at empanelled government and private hospitals for over 1,000 procedures, for families holding a valid ration card in Tamil Nadu.",
      ta: () => "மருத்துவ அல்லது மருத்துவமனை தேவையைக் குறிப்பிட்டுள்ளீர்கள். CMCHIS தமிழ்நாட்டில் செல்லுபடியாகும் குடும்ப அட்டை வைத்திருக்கும் குடும்பங்களுக்கு, பட்டியலிடப்பட்ட அரசு மற்றும் தனியார் மருத்துவமனைகளில் 1,000க்கும் மேற்பட்ட சிகிச்சைகளுக்கு ஆண்டுக்கு குடும்பத்திற்கு ₹5 லட்சம் வரை பணமில்லாச் சிகிச்சையை உள்ளடக்குகிறது.",
      hi: () => "आपने चिकित्सा या अस्पताल में भर्ती होने की ज़रूरत बताई है। CMCHIS तमिलनाडु में वैध राशन कार्ड रखने वाले परिवारों को सूचीबद्ध सरकारी और निजी अस्पतालों में 1,000 से अधिक प्रक्रियाओं के लिए प्रति परिवार प्रति वर्ष ₹5 लाख तक का कैशलेस इलाज देती है।",
    },
    apply: {
      en: ["Valid Tamil Nadu family (ration) card", "Aadhaar card"],
      ta: ["செல்லுபடியாகும் தமிழ்நாடு குடும்ப (ரேஷன்) அட்டை", "Aadhaar அட்டை"],
      hi: ["वैध तमिलनाडु परिवार (राशन) कार्ड", "आधार कार्ड"],
    },
    nextStep: {
      en: "Apply at your nearest CMCHIS help desk or government hospital",
      ta: "அருகிலுள்ள CMCHIS உதவி மையம் அல்லது அரசு மருத்துவமனையில் அணுகவும்",
      hi: "नज़दीकी CMCHIS हेल्प डेस्क या सरकारी अस्पताल में संपर्क करें",
    },
  },
  {
    id: "pmjay",
    name: "Ayushman Bharat PM-JAY",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "₹5,00,000", period: { en: "/ family / year (treatment cover)", ta: "/ குடும்பம் / ஆண்டு (சிகிச்சை)", hi: "/ परिवार / वर्ष (इलाज कवर)" } },
    category: "health",
    keywords: ["hospital","surgery","medical","sick","illness","poor family","below poverty","மருத்துவமனை","அறுவை சிகிச்சை","ஏழை குடும்பம்","अस्पताल","गरीब परिवार","इलाज"],
    reasons: {
      en: () => "Alongside CMCHIS, you may also be covered under Ayushman Bharat PM-JAY if your household is listed in the SECC deprivation database — it gives ₹5 lakh of hospitalisation cover per family per year at any empanelled hospital across India, useful if you travel outside Tamil Nadu for treatment.",
      ta: () => "CMCHIS உடன், உங்கள் குடும்பம் SECC பட்டியலில் இடம்பெற்றிருந்தால் Ayushman Bharat PM-JAY திட்டத்தின் கீழும் காப்பீடு பெறலாம் — இது இந்தியா முழுவதும் உள்ள பட்டியலிடப்பட்ட எந்த மருத்துவமனையிலும் குடும்பத்திற்கு ஆண்டுக்கு ₹5 லட்சம் மருத்துவமனை காப்பீட்டை வழங்குகிறது, தமிழ்நாட்டிற்கு வெளியே சிகிச்சைக்குச் செல்பவர்களுக்கு பயனுள்ளது.",
      hi: () => "CMCHIS के साथ-साथ, अगर आपका परिवार SECC डेटाबेस में सूचीबद्ध है तो आप Ayushman Bharat PM-JAY के तहत भी कवर हो सकते हैं — यह पूरे भारत में किसी भी सूचीबद्ध अस्पताल में प्रति परिवार प्रति वर्ष ₹5 लाख का अस्पताल कवर देती है, जो तमिलनाडु के बाहर इलाज कराने पर उपयोगी है।",
    },
    apply: {
      en: ["Aadhaar card", "SECC eligibility check at a CSC or hospital Ayushman desk"],
      ta: ["Aadhaar அட்டை", "CSC அல்லது மருத்துவமனை Ayushman மையத்தில் SECC தகுதி சரிபார்ப்பு"],
      hi: ["आधार कार्ड", "CSC या अस्पताल के आयुष्मान डेस्क पर SECC पात्रता जांच"],
    },
    nextStep: {
      en: "Check eligibility at pmjay.gov.in or a nearby empanelled hospital",
      ta: "pmjay.gov.in அல்லது அருகிலுள்ள பட்டியலிடப்பட்ட மருத்துவமனையில் தகுதியைச் சரிபார்க்கவும்",
      hi: "pmjay.gov.in या नज़दीकी सूचीबद्ध अस्पताल में पात्रता जांचें",
    },
  },
  {
    id: "national-family-benefit",
    name: "National Family Benefit Scheme",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "₹20,000", period: { en: "one-time", ta: "ஒருமுறை", hi: "एकमुश्त" } },
    category: "bereavement",
    keywords: ["breadwinner died","husband died","father died","earning member died","primary earner","சம்பாதிப்பவர் இறந்து","குடும்பத் தலைவர் இறந்து","कमाने वाले की मौत","मुखिया की मृत्यु"],
    reasons: {
      en: () => "You mention the death of the primary earning member of your family. The National Family Benefit Scheme gives a one-time payment of ₹20,000 to a BPL household on the death of its primary breadwinner (aged 18–59), to help cover the immediate loss of income.",
      ta: () => "உங்கள் குடும்பத்தின் முதன்மை வருமானம் ஈட்டுபவர் இறந்துவிட்டதாகக் குறிப்பிட்டுள்ளீர்கள். தேசிய குடும்ப நல திட்டம் BPL குடும்பத்தின் முதன்மை சம்பாதிப்பவர் (18–59 வயது) இறந்தால் ₹20,000 ஒருமுறைத் தொகையை வழங்குகிறது, உடனடி வருமான இழப்பை ஈடுகட்ட உதவும்.",
      hi: () => "आपने अपने परिवार के मुख्य कमाने वाले सदस्य की मृत्यु का ज़िक्र किया है। राष्ट्रीय परिवार लाभ योजना BPL परिवार के मुख्य कमाने वाले (18–59 वर्ष) की मृत्यु पर ₹20,000 की एकमुश्त सहायता देती है, ताकि आय के अचानक नुकसान की भरपाई हो सके।",
    },
    apply: {
      en: ["Death certificate of the primary earning member", "BPL/income certificate, applicant aged 18–59"],
      ta: ["முதன்மை சம்பாதிப்பவரின் இறப்புச் சான்றிதழ்", "BPL/வருமான சான்று, விண்ணப்பதாரர் வயது 18–59"],
      hi: ["मुख्य कमाने वाले सदस्य का मृत्यु प्रमाण पत्र", "BPL/आय प्रमाण पत्र, आवेदक की उम्र 18–59"],
    },
    nextStep: {
      en: "Apply at your Taluk Social Welfare Office",
      ta: "உங்கள் வட்ட சமூக நல அலுவலகத்தில் விண்ணப்பிக்கவும்",
      hi: "अपने तालुक समाज कल्याण कार्यालय में आवेदन करें",
    },
  },
  {
    id: "ujjwala",
    name: "Pradhan Mantri Ujjwala Yojana",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "Free LPG connection", period: { en: "one-time + subsidised refills", ta: "ஒருமுறை + மானிய ரீஃபில்", hi: "एकमुश्त + सब्सिडी रीफिल" } },
    category: "household",
    keywords: ["firewood","cooking gas","no gas connection","kerosene stove","விறகு","சமையல் எரிவாயு இல்லை","लकड़ी","गैस कनेक्शन नहीं","चूल्हा"],
    reasons: {
      en: () => "You mention cooking without an LPG connection, using firewood or kerosene. Ujjwala Yojana gives women from BPL households a free LPG connection with first refill and stove support, reducing health risk from smoke and time spent collecting fuel.",
      ta: () => "எரிவாயு இணைப்பு இல்லாமல் விறகு அல்லது மண்ணெண்ணெயில் சமைப்பதாகக் குறிப்பிட்டுள்ளீர்கள். Ujjwala திட்டம் BPL குடும்பப் பெண்களுக்கு இலவச LPG இணைப்பையும் முதல் ரீஃபில் மற்றும் அடுப்பு உதவியையும் வழங்குகிறது, புகையால் ஏற்படும் உடல்நல அபாயத்தையும் எரிபொருள் சேகரிக்கும் நேரத்தையும் குறைக்கிறது.",
      hi: () => "आपने बिना गैस कनेक्शन के लकड़ी या मिट्टी के तेल से खाना पकाने का ज़िक्र किया है। उज्ज्वला योजना BPL परिवार की महिलाओं को मुफ्त LPG कनेक्शन, पहला रीफिल और चूल्हा सहायता देती है, जिससे धुएँ से सेहत को खतरा और ईंधन जुटाने में लगने वाला समय कम होता है।",
    },
    apply: {
      en: ["BPL ration card", "Aadhaar and bank account in the woman applicant's name"],
      ta: ["BPL ரேஷன் அட்டை", "Aadhaar மற்றும் பெண் விண்ணப்பதாரர் பெயரில் வங்கிக் கணக்கு"],
      hi: ["BPL राशन कार्ड", "आधार और महिला आवेदक के नाम बैंक खाता"],
    },
    nextStep: {
      en: "Apply at your nearest LPG distributor",
      ta: "அருகிலுள்ள LPG விநியோகஸ்தரிடம் விண்ணப்பிக்கவும்",
      hi: "नज़दीकी LPG वितरक के पास आवेदन करें",
    },
  },
  {
    id: "tn-free-bus",
    name: "Tamil Nadu Free Bus Travel Scheme for Women",
    agency: { en: "Tamil Nadu Government", ta: "தமிழ்நாடு அரசு", hi: "तमिलनाडु सरकार" },
    amount: { value: "Free travel", period: { en: "ordinary govt. buses within TN", ta: "TN சாதாரண அரசு பேருந்துகளில்", hi: "TN की साधारण सरकारी बसों में" } },
    category: "transport",
    keywords: ["woman","travel","bus fare","daily commute","பெண்","பேருந்து","பயணச் செலவு","महिला","बस किराया","यात्रा"],
    reasons: {
      en: () => "As a woman resident of Tamil Nadu, you already qualify for free travel on ordinary (non-AC) government buses across the state — simply show any government-issued photo ID to the conductor. This can meaningfully reduce your daily commuting cost.",
      ta: () => "தமிழ்நாட்டில் வசிக்கும் பெண்ணாக, மாநிலம் முழுவதும் சாதாரண (AC அல்லாத) அரசுப் பேருந்துகளில் இலவசப் பயணத்திற்கு நீங்கள் ஏற்கனவே தகுதி பெற்றுள்ளீர்கள் — கண்டக்டரிடம் ஏதேனும் அரசு புகைப்பட அடையாள அட்டையைக் காட்டினால் போதும். இது உங்கள் அன்றாடப் பயணச் செலவைக் குறிப்பிடத்தக்க அளவு குறைக்கும்.",
      hi: () => "तमिलनाडु में रहने वाली महिला होने के नाते, आप राज्य भर की साधारण (नॉन-AC) सरकारी बसों में मुफ्त यात्रा के लिए पहले से पात्र हैं — बस कंडक्टर को कोई भी सरकारी फोटो पहचान पत्र दिखाना काफी है। इससे आपकी रोज़ की यात्रा का खर्च काफी कम हो सकता है।",
    },
    apply: {
      en: ["Any government-issued photo ID", "No advance registration needed"],
      ta: ["ஏதேனும் அரசு புகைப்பட அடையாள அட்டை", "முன்கூட்டிய பதிவு தேவையில்லை"],
      hi: ["कोई भी सरकारी फोटो पहचान पत्र", "पहले से पंजीकरण की ज़रूरत नहीं"],
    },
    nextStep: {
      en: "Show your ID to the conductor while boarding any ordinary TN government bus",
      ta: "தமிழ்நாடு சாதாரண அரசுப் பேருந்தில் ஏறும்போது கண்டக்டரிடம் அடையாள அட்டையைக் காட்டவும்",
      hi: "तमिलनाडु की किसी भी साधारण सरकारी बस में चढ़ते समय कंडक्टर को पहचान पत्र दिखाएं",
    },
  },
  {
    id: "post-matric-scholarship",
    name: "Post-Matric Scholarship for SC/ST Students",
    agency: { en: "Central + State Government", ta: "மத்திய + மாநில அரசு", hi: "केंद्र + राज्य सरकार" },
    amount: null,
    category: "education",
    keywords: ["student","college fee","studying","school dropout","education","படிக்கும்","கல்லூரி கட்டணம்","மாணவர்","पढ़ाई","कॉलेज फीस","छात्र"],
    reasons: {
      en: () => "You mention a child or family member studying in college or a higher class. SC/ST students from families below the income ceiling can get their tuition fee, maintenance allowance, and other course costs covered under the Post-Matric Scholarship, paid directly to the student's account each year.",
      ta: () => "கல்லூரியில் அல்லது உயர் வகுப்பில் படிக்கும் குழந்தை அல்லது குடும்ப உறுப்பினரைக் குறிப்பிட்டுள்ளீர்கள். வருமான வரம்புக்குக் கீழுள்ள குடும்பங்களைச் சேர்ந்த SC/ST மாணவர்கள் Post-Matric Scholarship மூலம் கல்விக் கட்டணம், பராமரிப்பு உதவித்தொகை மற்றும் பிற படிப்புச் செலவுகளைப் பெறலாம், ஒவ்வொரு ஆண்டும் மாணவரின் கணக்கில் நேரடியாக செலுத்தப்படும்.",
      hi: () => "आपने कॉलेज या उच्च कक्षा में पढ़ने वाले बच्चे या परिवार के सदस्य का ज़िक्र किया है। आय सीमा से नीचे के परिवारों के SC/ST छात्र Post-Matric Scholarship के तहत ट्यूशन फीस, रखरखाव भत्ता और अन्य पाठ्यक्रम खर्च पा सकते हैं, जो हर साल सीधे छात्र के खाते में जाता है।",
    },
    apply: {
      en: ["SC/ST community certificate", "Income certificate and college admission/fee receipt"],
      ta: ["SC/ST சமூகச் சான்றிதழ்", "வருமான சான்று மற்றும் கல்லூரி சேர்க்கை/கட்டணப் பற்றுச்சீட்டு"],
      hi: ["SC/ST समुदाय प्रमाण पत्र", "आय प्रमाण पत्र और कॉलेज प्रवेश/फीस रसीद"],
    },
    benefit: {
      en: "Tuition fee, maintenance allowance, and other course costs covered each year",
      ta: "ஒவ்வொரு ஆண்டும் கல்விக் கட்டணம், பராமரிப்பு உதவித்தொகை மற்றும் பிற படிப்புச் செலவுகள் ஈடுசெய்யப்படும்",
      hi: "हर साल ट्यूशन फीस, रखरखाव भत्ता और अन्य पाठ्यक्रम खर्च कवर किए जाते हैं",
    },
    nextStep: {
      en: "Apply at the National Scholarship Portal (scholarships.gov.in)",
      ta: "தேசிய உதவித்தொகை போர்டல் (scholarships.gov.in) மூலம் விண்ணப்பிக்கவும்",
      hi: "राष्ट्रीय छात्रवृत्ति पोर्टल (scholarships.gov.in) पर आवेदन करें",
    },
  },
  {
    id: "jan-dhan",
    name: "Pradhan Mantri Jan Dhan Yojana",
    agency: { en: "Central Government", ta: "மத்திய அரசு", hi: "केंद्र सरकार" },
    amount: { value: "₹10,000", period: { en: "overdraft facility, zero-balance account", ta: "ஓவர்டிராஃப்ட் வசதி, பூஜ்ஜிய இருப்பு கணக்கு", hi: "ओवरड्राफ्ट सुविधा, ज़ीरो-बैलेंस खाता" } },
    category: "banking",
    keywords: ["no bank account","no bank","unbanked","வங்கிக் கணக்கு இல்லை","बैंक खाता नहीं"],
    reasons: {
      en: () => "You mention not having a bank account — this is worth fixing first, since almost every other scheme above pays directly to a bank account. Jan Dhan Yojana lets you open a zero-balance account at any bank branch with basic ID, and after 6 months of regular use you can access an overdraft facility of up to ₹10,000.",
      ta: () => "உங்களிடம் வங்கிக் கணக்கு இல்லை என்று குறிப்பிட்டுள்ளீர்கள் — இதை முதலில் சரிசெய்வது நல்லது, ஏனெனில் மேலுள்ள ஏறக்குறைய அனைத்து திட்டங்களும் நேரடியாக வங்கிக் கணக்கிற்குச் செலுத்தப்படும். Jan Dhan Yojana மூலம் அடிப்படை அடையாள ஆவணத்துடன் எந்த வங்கிக் கிளையிலும் பூஜ்ஜிய இருப்புக் கணக்கைத் திறக்கலாம், 6 மாதங்கள் தொடர்ந்து பயன்படுத்தியபின் ₹10,000 வரை ஓவர்டிராஃப்ட் வசதியைப் பெறலாம்.",
      hi: () => "आपने बताया है कि आपके पास बैंक खाता नहीं है — इसे पहले ठीक करना ज़रूरी है, क्योंकि ऊपर लगभग हर योजना सीधे बैंक खाते में भुगतान करती है। Jan Dhan Yojana से आप किसी भी बैंक शाखा में बुनियादी पहचान पत्र के साथ ज़ीरो-बैलेंस खाता खोल सकते हैं, और 6 महीने नियमित उपयोग के बाद ₹10,000 तक की ओवरड्राफ्ट सुविधा मिल सकती है।",
    },
    apply: {
      en: ["Basic ID proof (Aadhaar or voter ID)", "No minimum balance required to open the account"],
      ta: ["அடிப்படை அடையாள ஆவணம் (Aadhaar அல்லது வாக்காளர் அட்டை)", "கணக்குத் திறக்க குறைந்தபட்ச இருப்பு தேவையில்லை"],
      hi: ["बुनियादी पहचान प्रमाण (आधार या वोटर आईडी)", "खाता खोलने के लिए न्यूनतम शेष राशि ज़रूरी नहीं"],
    },
    nextStep: {
      en: "Open an account at your nearest bank branch",
      ta: "அருகிலுள்ள வங்கிக் கிளையில் கணக்கு திறக்கவும்",
      hi: "अपनी नज़दीकी बैंक शाखा में खाता खोलें",
    },
  },
];

// Display metadata for scheme.category — used for the small category tag on
// each result card. Deliberately no per-category colour: the design tokens
// are locked, so every tag uses the same accent/border tokens and is
// distinguished only by its label and (shared) icon.
const CATEGORY_META = {
  farmer: { en: "Agriculture", ta: "விவசாயம்", hi: "कृषि" },
  employment: { en: "Employment", ta: "வேலைவாய்ப்பு", hi: "रोज़गार" },
  housing: { en: "Housing", ta: "வீட்டு வசதி", hi: "आवास" },
  elderly: { en: "Senior Citizen", ta: "மூத்த குடிமக்கள்", hi: "वरिष्ठ नागरिक" },
  widow: { en: "Women & Child", ta: "பெண்கள் & குழந்தைகள்", hi: "महिला एवं बाल" },
  disability: { en: "Disability Support", ta: "மாற்றுத்திறனாளர் ஆதரவு", hi: "दिव्यांग सहायता" },
  health: { en: "Health", ta: "சுகாதாரம்", hi: "स्वास्थ्य" },
  bereavement: { en: "Family Support", ta: "குடும்ப உதவி", hi: "पारिवारिक सहायता" },
  household: { en: "Household Essentials", ta: "வீட்டு அத்தியாவசியம்", hi: "घरेलू आवश्यकता" },
  transport: { en: "Women & Child", ta: "பெண்கள் & குழந்தைகள்", hi: "महिला एवं बाल" },
  education: { en: "Education", ta: "கல்வி", hi: "शिक्षा" },
  banking: { en: "Banking", ta: "வங்கி சேவை", hi: "बैंकिंग" },
};

if (typeof module !== "undefined" && module.exports) module.exports = { SCHEMES, CATEGORY_META };
