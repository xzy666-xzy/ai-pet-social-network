from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from math import radians, sin, cos, sqrt, atan2

app = FastAPI(title="WePet AI Recommendation Service")


# =========================
# Pydantic Models
# =========================

class PetUser(BaseModel):
    id: str
    petType: Optional[str] = None
    petAge: Optional[float] = None
    activityLevel: Optional[float] = 3
    personalityTags: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    location: Optional[Dict[str, float]] = None  # {"lat": 37.5, "lng": 127.0}


class RecommendRequest(BaseModel):
    currentUser: PetUser
    candidates: List[PetUser]


class RecommendationItem(BaseModel):
    id: str
    score: int
    reasons: List[str]


class RecommendResponse(BaseModel):
    recommendations: List[RecommendationItem]


# =========================
# Utility Functions
# =========================

def normalize_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def jaccard_similarity(a: List[str], b: List[str]) -> float:
    set_a = set(normalize_text(x) for x in a if normalize_text(x))
    set_b = set(normalize_text(x) for x in b if normalize_text(x))

    if not set_a and not set_b:
        return 0.5
    if not set_a or not set_b:
        return 0.0

    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union else 0.0


def age_score(age1: Optional[float], age2: Optional[float]) -> float:
    if age1 is None or age2 is None:
        return 0.5

    diff = abs(age1 - age2)
    if diff <= 1:
        return 1.0
    if diff <= 2:
        return 0.85
    if diff <= 4:
        return 0.65
    if diff <= 6:
        return 0.45
    return 0.2


def pet_type_score(type1: Optional[str], type2: Optional[str]) -> float:
    t1 = normalize_text(type1)
    t2 = normalize_text(type2)

    if not t1 or not t2:
        return 0.5
    if t1 == t2:
        return 1.0

    # 简单的“狗/猫”等大类兼容
    dog_keywords = ["dog", "puppy", "retriever", "poodle", "samoyed", "shiba", "sheepdog"]
    cat_keywords = ["cat", "kitten"]

    is_dog_1 = any(k in t1 for k in dog_keywords)
    is_dog_2 = any(k in t2 for k in dog_keywords)
    is_cat_1 = any(k in t1 for k in cat_keywords)
    is_cat_2 = any(k in t2 for k in cat_keywords)

    if (is_dog_1 and is_dog_2) or (is_cat_1 and is_cat_2):
        return 0.7

    return 0.35


def activity_score(level1: Optional[float], level2: Optional[float]) -> float:
    l1 = level1 if level1 is not None else 3
    l2 = level2 if level2 is not None else 3

    diff = abs(l1 - l2)
    if diff == 0:
        return 1.0
    if diff <= 1:
        return 0.8
    if diff <= 2:
        return 0.55
    return 0.25


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)

    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def location_score(loc1: Optional[Dict[str, float]], loc2: Optional[Dict[str, float]]) -> float:
    if not loc1 or not loc2:
        return 0.5

    try:
        lat1, lng1 = float(loc1["lat"]), float(loc1["lng"])
        lat2, lng2 = float(loc2["lat"]), float(loc2["lng"])
    except Exception:
        return 0.5

    distance = haversine_km(lat1, lng1, lat2, lng2)

    if distance <= 1:
        return 1.0
    if distance <= 3:
        return 0.85
    if distance <= 5:
        return 0.7
    if distance <= 10:
        return 0.5
    return 0.25


def build_reasons(
        current_user: PetUser,
        candidate: PetUser,
        scores: Dict[str, float]
) -> List[str]:
    reasons: List[str] = []

    if scores["pet_type"] >= 0.95:
        reasons.append("同品种更容易建立熟悉感")
    elif scores["pet_type"] >= 0.7:
        reasons.append("宠物类型相近，互动风格更容易匹配")

    if scores["age"] >= 0.85:
        reasons.append("年龄接近，互动节奏更合适")

    if scores["activity"] >= 0.8:
        reasons.append("活跃度相近，适合一起散步或玩耍")

    if scores["personality"] >= 0.5:
        reasons.append("性格标签有重合，更容易相处")

    if scores["interests"] >= 0.5:
        reasons.append("兴趣偏好相近，适合安排共同活动")

    if scores["location"] >= 0.7:
        reasons.append("距离较近，线下见面更方便")

    if not reasons:
        reasons.append("整体画像匹配度较高，值得进一步认识")

    return reasons[:3]


def calculate_match_score(current_user: PetUser, candidate: PetUser) -> Dict[str, Any]:
    scores = {
        "pet_type": pet_type_score(current_user.petType, candidate.petType),
        "age": age_score(current_user.petAge, candidate.petAge),
        "activity": activity_score(current_user.activityLevel, candidate.activityLevel),
        "personality": jaccard_similarity(current_user.personalityTags, candidate.personalityTags),
        "interests": jaccard_similarity(current_user.interests, candidate.interests),
        "location": location_score(current_user.location, candidate.location),
    }

    # 权重可后续微调
    weighted = (
            scores["pet_type"] * 0.22 +
            scores["age"] * 0.16 +
            scores["activity"] * 0.18 +
            scores["personality"] * 0.18 +
            scores["interests"] * 0.16 +
            scores["location"] * 0.10
    )

    final_score = max(1, min(99, round(weighted * 100)))
    reasons = build_reasons(current_user, candidate, scores)

    return {
        "id": candidate.id,
        "score": final_score,
        "reasons": reasons,
        "debug_scores": scores,
    }


# =========================
# Routes
# =========================

@app.get("/")
def root():
    return {
        "message": "WePet AI recommendation service is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest):
    current_user = payload.currentUser
    candidates = payload.candidates

    results = []
    for candidate in candidates:
        if candidate.id == current_user.id:
            continue
        results.append(calculate_match_score(current_user, candidate))

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "recommendations": [
            {
                "id": item["id"],
                "score": item["score"],
                "reasons": item["reasons"],
            }
            for item in results
        ]
    }