import re
from typing import Dict, Any, Optional, Tuple

# Comprehensive Hindi/Hinglish to English Crop mapping
CROP_ALIASES = {
    "dhaan": "Rice", "dhan": "Rice", "chawal": "Rice", "धान": "Rice", "चावल": "Rice", "rice": "Rice", "paddy": "Rice",
    "gehun": "Wheat", "gehu": "Wheat", "गेहूं": "Wheat", "wheat": "Wheat",
    "makka": "Maize", "makkay": "Maize", "मक्का": "Maize", "maize": "Maize", "corn": "Maize",
    "kapas": "Cotton", "कपास": "Cotton", "cotton": "Cotton",
    "soybean": "Soybean", "soya": "Soybean", "सोयाबीन": "Soybean", "soyabean": "Soybean",
    "ganna": "Sugarcane", "गन्ना": "Sugarcane", "sugarcane": "Sugarcane",
    "chana": "Gram", "चना": "Gram", "gram": "Gram", "chickpea": "Gram",
    "tur": "Tur (Pigeon Pea)", "arhar": "Tur (Pigeon Pea)", "तुअर": "Tur (Pigeon Pea)", "अरहर": "Tur (Pigeon Pea)", "pigeon pea": "Tur (Pigeon Pea)",
    "moongfali": "Groundnut", "mungfali": "Groundnut", "मूंगफली": "Groundnut", "groundnut": "Groundnut", "peanut": "Groundnut",
    "sarson": "Mustard", "सरसों": "Mustard", "mustard": "Mustard", "raya": "Mustard",
    "bajra": "Bajra", "बाजरा": "Bajra", "pearl millet": "Bajra",
    "jowar": "Jowar", "ज्वार": "Jowar", "sorghum": "Jowar",
    "aaloo": "Potato", "alu": "Potato", "आलू": "Potato", "potato": "Potato",
    "pyaaz": "Onion", "pyaj": "Onion", "प्याज": "Onion", "onion": "Onion",
    "jau": "Barley", "जौ": "Barley", "barley": "Barley",
    "moong": "Moong", "मूंग": "Moong", "green gram": "Moong",
    "urad": "Urad", "उड़द": "Urad", "black gram": "Urad",
    "ragi": "Ragi", "रागी": "Ragi", "finger millet": "Ragi",
    "surajmukhi": "Sunflower", "सूरजमुखी": "Sunflower", "sunflower": "Sunflower",
    "jute": "Jute", "जूट": "Jute", "पटसन": "Jute"
}

# Growth Stage aliases
STAGE_ALIASES = {
    "buwai": "Sowing", "buvai": "Sowing", "sowing": "Sowing", "sow": "Sowing", "बुआई": "Sowing", "बोने": "Sowing", "beej": "Sowing", "seed": "Sowing",
    "ankuran": "Germination / Establishment", "ankuraan": "Germination / Establishment", "अंकुरण": "Germination / Establishment",
    "jamav": "Germination / Establishment", "जमाव": "Germination / Establishment", "germination": "Germination / Establishment",
    "establishment": "Germination / Establishment", "nursery": "Germination / Establishment", "paudh": "Germination / Establishment", "पौधशाला": "Germination / Establishment",
    "vegetative": "Vegetative", "badhwar": "Vegetative", "growth": "Vegetative", "वानस्पतिक": "Vegetative", "बढ़वार": "Vegetative",
    "flowering": "Flowering", "flower": "Flowering", "फूल": "Flowering", "पुष्पन": "Flowering", "phool": "Flowering", "blooming": "Flowering",
    "dana": "Grain/Fruit Development", "दाना": "Grain/Fruit Development", "fruit": "Grain/Fruit Development", "फल": "Grain/Fruit Development",
    "grain": "Grain/Fruit Development", "pod": "Grain/Fruit Development", "development": "Grain/Fruit Development",
    "katai": "Harvest", "कटाई": "Harvest", "harvest": "Harvest", "harvesting": "Harvest", "gahai": "Harvest", "गहाई": "Harvest", "ripe": "Harvest"
}

# Major Locations (Districts & States)
LOCATION_ALIASES = {
    # Districts
    "meerut": "Meerut", "मेरठ": "Meerut",
    "lucknow": "Lucknow", "लखनऊ": "Lucknow",
    "kanpur": "Kanpur", "कानपुर": "Kanpur",
    "patna": "Patna", "पटना": "Patna",
    "jaipur": "Jaipur", "जयपुर": "Jaipur",
    "udaipur": "Udaipur", "उदयपुर": "Udaipur",
    "mumbai": "Mumbai", "मुंबई": "Mumbai",
    "pune": "Pune", "पुणे": "Pune",
    "nashik": "Nashik", "नासिक": "Nashik",
    "ahmedabad": "Ahmedabad", "अहमदाबाद": "Ahmedabad",
    "surat": "Surat", "सूरत": "Surat",
    "bengaluru": "Bengaluru", "bangalore": "Bengaluru", "बेंगलुरु": "Bengaluru",
    "mysuru": "Mysuru", "mysore": "Mysuru", "मैसूर": "Mysuru",
    "wayanad": "Wayanad", "वायनाड": "Wayanad",
    "idukki": "Idukki", "इडुक्की": "Idukki",
    "kolkata": "Kolkata", "कोलकाता": "Kolkata",
    "darjeeling": "Darjeeling", "दार्जिलिंग": "Darjeeling",
    "amritsar": "Amritsar", "अमृतसर": "Amritsar",
    "ludhiana": "Ludhiana", "लुधियाना": "Ludhiana",
    "guwahati": "Guwahati", "गुवाहाटी": "Guwahati",

    # States
    "uttar pradesh": "Uttar Pradesh", "up": "Uttar Pradesh", "उत्तर प्रदेश": "Uttar Pradesh",
    "bihar": "Bihar", "बिहार": "Bihar",
    "maharashtra": "Maharashtra", "महाराष्ट्र": "Maharashtra",
    "rajasthan": "Rajasthan", "राजस्थान": "Rajasthan",
    "punjab": "Punjab", "पंजाब": "Punjab",
    "gujarat": "Gujarat", "गुजरात": "Gujarat",
    "karnataka": "Karnataka", "कर्नाटक": "Karnataka",
    "kerala": "Kerala", "केरल": "Kerala",
    "west bengal": "West Bengal", "bengal": "West Bengal", "पश्चिम बंगाल": "West Bengal",
    "assam": "Assam", "असम": "Assam",
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh", "मध्य प्रदेश": "Madhya Pradesh",
    "haryana": "Haryana", "हरियाणा": "Haryana"
}

def extract_agro_context(question: str, prior_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extracts agro-meteorological entities and intent from farmer query:
    - location (District or State)
    - crop (Canonical crop name)
    - growth_stage (Canonical growth stage)
    - forecast_horizon ("7D", "14D", "21D", "30D")
    - intent ("DEFINITION", "CONTINGENCY", "GENERAL")
    Falls back gracefully to prior_context when the question is a follow-up.
    """
    q_lower = question.lower()
    prior = prior_context or {}

    # 1. Detect Intent
    intent = "GENERAL"
    if any(w in q_lower for w in ["matlab", "meaning", "kya hota hai", "kya hoti hai", "किसे कहते", "का क्या मतलब"]):
        intent = "DEFINITION"
    elif any(w in q_lower for w in ["nahi hui toh", "nahi aayi toh", "na ho toh", "agar baarish na", "sukha pad jaye", "बारिश नहीं हुई तो", "सूखा पड़ जाए"]):
        intent = "CONTINGENCY"
    elif any(w in q_lower for w in ["pichhle", "pichle", "पिछले", "above", "as mentioned", "us hisab se", "uske hisab se"]):
        intent = "FOLLOW_UP"

    # 2. Extract Crop
    detected_crop = None
    for alias, canonical in CROP_ALIASES.items():
        pattern = r'\b' + re.escape(alias) + r'\b'
        if re.search(pattern, q_lower) or alias in q_lower:
            detected_crop = canonical
            break
    if not detected_crop and prior.get("crop"):
        detected_crop = prior.get("crop")

    # 3. Extract Growth Stage
    detected_stage = None
    for alias, canonical in STAGE_ALIASES.items():
        pattern = r'\b' + re.escape(alias) + r'\b'
        if re.search(pattern, q_lower) or alias in q_lower:
            detected_stage = canonical
            break
    if not detected_stage and prior.get("growth_stage"):
        detected_stage = prior.get("growth_stage")

    # 4. Extract Location
    detected_location = None
    for alias, canonical in LOCATION_ALIASES.items():
        pattern = r'\b' + re.escape(alias) + r'\b'
        if re.search(pattern, q_lower) or alias in q_lower:
            detected_location = canonical
            break
    if not detected_location and prior.get("location"):
        detected_location = prior.get("location")

    # 5. Extract Horizon
    detected_horizon = "7D"
    if any(w in q_lower for w in ["14 din", "14-day", "14d", "chaudah", "chauda", "चौदह", "दो हफ्ते", "do hafte", "2 week"]):
        detected_horizon = "14D"
    elif any(w in q_lower for w in ["21 din", "21-day", "21d", "ikkis", "इक्कीस", "तीन हफ्ते", "3 week"]):
        detected_horizon = "21D"
    elif any(w in q_lower for w in ["30 din", "30-day", "30d", "tees din", "तीस", "mahina", "month", "महीना"]):
        detected_horizon = "30D"
    elif any(w in q_lower for w in ["7 din", "7-day", "7d", "saat", "सात", "hafta", "week", "हफ्ता"]):
        detected_horizon = "7D"
    elif prior.get("forecast_horizon"):
        detected_horizon = prior.get("forecast_horizon")

    return {
        "location": detected_location,
        "crop": detected_crop,
        "growth_stage": detected_stage,
        "forecast_horizon": detected_horizon,
        "intent": intent
    }
