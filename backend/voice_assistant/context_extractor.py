import re
from typing import Dict, Any, Optional, Tuple

# Comprehensive Hindi/Hinglish to English Crop mapping
CROP_ALIASES = {
    # Rice / Paddy
    "dhaan": "Rice", "chawal": "Rice", "paddy": "Rice", "धान": "Rice", "चावल": "Rice", "rice": "Rice", "dhan": "Rice",
    # Wheat
    "gehun": "Wheat", "gehu": "Wheat", "genhu": "Wheat", "गेहूं": "Wheat", "गेहुं": "Wheat", "wheat": "Wheat", "kanak": "Wheat",
    # Maize
    "makka": "Maize", "makke": "Maize", "makkay": "Maize", "makai": "Maize", "मक्का": "Maize", "मक्के": "Maize", "मकई": "Maize", "maize": "Maize", "corn": "Maize", "bhutta": "Maize",
    # Cotton
    "kapas": "Cotton", "कपास": "Cotton", "cotton": "Cotton", "rui": "Cotton",
    # Soybean
    "soybean": "Soybean", "soya": "Soybean", "soyabean": "Soybean", "सोयाबीन": "Soybean", "सोया": "Soybean",
    # Sugarcane
    "ganna": "Sugarcane", "ganne": "Sugarcane", "गन्ना": "Sugarcane", "गन्ने": "Sugarcane", "sugarcane": "Sugarcane", "eekh": "Sugarcane", "ईख": "Sugarcane",
    # Gram / Chickpea
    "chana": "Gram", "chane": "Gram", "चना": "Gram", "चने": "Gram", "gram": "Gram", "chickpea": "Gram", "chhole": "Gram",
    # Tur / Arhar
    "arhar": "Tur (Pigeon Pea)", "tur": "Tur (Pigeon Pea)", "toor": "Tur (Pigeon Pea)", "तुअर": "Tur (Pigeon Pea)", "अरहर": "Tur (Pigeon Pea)", "तूर": "Tur (Pigeon Pea)", "pigeon pea": "Tur (Pigeon Pea)",
    # Groundnut
    "moongfali": "Groundnut", "mungfali": "Groundnut", "मूंगफली": "Groundnut", "groundnut": "Groundnut", "peanut": "Groundnut",
    # Mustard
    "sarson": "Mustard", "sarso": "Mustard", "सरसों": "Mustard", "mustard": "Mustard", "rai": "Mustard", "raya": "Mustard",
    # Bajra
    "bajra": "Bajra", "बाजरा": "Bajra", "pearl millet": "Bajra",
    # Jowar
    "jowar": "Jowar", "jawar": "Jowar", "ज्वार": "Jowar", "sorghum": "Jowar",
    # Potato
    "aaloo": "Potato", "alu": "Potato", "आलू": "Potato", "potato": "Potato",
    # Onion
    "pyaaz": "Onion", "pyaj": "Onion", "प्याज": "Onion", "kanda": "Onion", "कांदा": "Onion", "onion": "Onion",
    # Barley
    "jau": "Barley", "जौ": "Barley", "barley": "Barley",
    # Moong
    "moong": "Moong", "मूंग": "Moong", "green gram": "Moong",
    # Urad
    "urad": "Urad", "उड़द": "Urad", "black gram": "Urad",
    # Sunflower
    "surajmukhi": "Sunflower", "सूरजमुखी": "Sunflower", "sunflower": "Sunflower",
    # Jute
    "jute": "Jute", "जूट": "Jute", "patsan": "Jute", "पटसन": "Jute",
    # Tea & Coffee
    "chai": "Tea", "चाय": "Tea", "tea": "Tea", "coffee": "Coffee", "कॉफी": "Coffee"
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

def _match_entity(text: str, alias_dict: Dict[str, str]) -> Optional[str]:
    """
    Safely matches aliases using regex word boundaries to prevent false substring matches
    (e.g., 'dhan' in 'dhanyawad', 'tur' in 'future', 'alu' in 'chalu').
    """
    # Sort longest alias first to match multi-word phrases first
    for alias in sorted(alias_dict.keys(), key=len, reverse=True):
        canonical = alias_dict[alias]
        if re.search(r'[\u0900-\u097F]', alias):
            pattern = r'(?<![\u0900-\u097F])' + re.escape(alias) + r'(?![\u0900-\u097F])'
        else:
            pattern = r'(?<![a-zA-Z])' + re.escape(alias.lower()) + r'(?![a-zA-Z])'
        
        if re.search(pattern, text):
            return canonical
    return None

def extract_agro_context(question: str, prior_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extracts agro-meteorological entities and intent from farmer query:
    - location (District or State)
    - crop (Canonical crop name)
    - growth_stage (Canonical growth stage)
    - forecast_horizon ("7D", "14D", "21D", "30D")
    - intent ("DEFINITION", "CONTINGENCY", "GENERAL")
    Falls back gracefully to prior_context only when question is an explicit follow-up.
    """
    q_lower = question.lower()
    prior = prior_context or {}

    # 1. Detect Intent
    intent = "GENERAL"
    if any(w in q_lower for w in ["matlab", "meaning", "kya hota hai", "kya hoti hai", "किसे कहते", "का क्या मतलब"]):
        intent = "DEFINITION"
    elif any(w in q_lower for w in ["nahi hui toh", "nahi aayi toh", "na ho toh", "agar baarish na", "sukha pad jaye", "बारिश नहीं हुई तो", "सूखा पड़ जाए"]):
        intent = "CONTINGENCY"
    elif any(w in q_lower for w in ["pichhle", "pichle", "पिछले", "above", "as mentioned", "us hisab se", "uske hisab se", "iska kya", "ab kya", "fir kya", "tab kya"]):
        intent = "FOLLOW_UP"

    # 2. Extract Crop (Strict boundary match)
    detected_crop = _match_entity(q_lower, CROP_ALIASES)
    # Only inherit prior crop if question is an explicit follow-up or asks about crop advice
    if not detected_crop and prior.get("crop"):
        if intent in ["CONTINGENCY", "FOLLOW_UP"] or any(w in q_lower for w in ["fasal", "फसल", "crop", "paani", "sinchai", "salah", "सलाह"]):
            detected_crop = prior.get("crop")

    # 3. Extract Growth Stage (Strict boundary match)
    detected_stage = _match_entity(q_lower, STAGE_ALIASES)
    if not detected_stage and prior.get("growth_stage"):
        if intent in ["CONTINGENCY", "FOLLOW_UP"]:
            detected_stage = prior.get("growth_stage")

    # 4. Extract Location (Strict boundary match)
    detected_location = _match_entity(q_lower, LOCATION_ALIASES)
    if not detected_location and prior.get("location"):
        detected_location = prior.get("location")

    # 5. Extract Horizon
    detected_horizon = None
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
    else:
        detected_horizon = "7D"

    return {
        "location": detected_location,
        "crop": detected_crop,
        "growth_stage": detected_stage,
        "forecast_horizon": detected_horizon,
        "intent": intent
    }
