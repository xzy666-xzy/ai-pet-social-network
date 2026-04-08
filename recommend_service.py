from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from math import sqrt

app = FastAPI()


class Location(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None


class UserProfile(BaseModel):
    id: str
    petType: Optional[str] = None
    petAge: Optional[int] = None
    activityLevel: Optional[int] = None   # 1 ~ 5
    personalityTags: List[str] = []
    interests: List[str] = []
    location: Optional[Location] = None


class RecommendRequest(BaseModel):
    currentUser: UserProfile
    candidates: List[UserProfile]


def calc_pet_type_score(a: Optional[str], b: Optional[str]) -> float:
    if not a or not b:
        return 0
    return 20 if a == b else 0


def calc_age_score(a: Optional[int], b: Optional[int]) -> float:
    if a is None or b is None:
        return 0
    diff = abs(a - b)
    if diff <= 1:
        return 15
    if diff <= 3:
        return 10
    if diff <= 5:
        return 5
    return 0


def calc_activity_score(a: Optional[int], b: Optional[int]) -> float:
    if a is None or b is None:
        return 0
    diff = abs(a - b)
    if diff == 0:
        return 25
    if diff == 1:
        return 18
    if diff == 2:
        return 10
    return 0


def calc_overlap_score(a: List[str], b: List[str], max_score: float) -> float:
    if not a or not b:
        return 0
    set_a = set(a)
    overlap = len([x for x in b if x in set_a])
    max_len = max(len(a), len(b))
    if max_len == 0:
        return 0
    return round((overlap / max_len) * max_score, 2)


def calc_distance_score(loc1: Optional[Location], loc2: Optional[Location]) -> float:
    if not loc1 or not loc2:
        return 0
    if loc1.lat is None or loc1.lng is None or loc2.lat is None or loc2.lng is None:
        return 0

    dx = loc1.lat - loc2.lat
    dy = loc1.lng - loc2.lng
    distance = sqrt(dx * dx + dy * dy)

    if distance < 0.01:
        return 15
    if distance < 0.03:
        return 10
    if distance < 0.05:
        return 5
    return 0


def recommend_reason(detail: dict) -> List[str]:
    reasons = []
    if detail["petTypeScore"] > 0:
        reasons.append("同类宠物")
    if detail["activityScore"] >= 18:
        reasons.append("活动量相近")
    if detail["personalityScore"] >= 10:
        reasons.append("性格标签相似")
    if detail["interestScore"] >= 5:
        reasons.append("兴趣相似")
    if detail["distanceScore"] > 0:
        reasons.append("距离较近")
    return reasons


def calculate_match_score(me: UserProfile, target: UserProfile):
    pet_type_score = calc_pet_type_score(me.petType, target.petType)
    age_score = calc_age_score(me.petAge, target.petAge)
    activity_score = calc_activity_score(me.activityLevel, target.activityLevel)
    personality_score = calc_overlap_score(me.personalityTags, target.personalityTags, 25)
    interest_score = calc_overlap_score(me.interests, target.interests, 10)
    distance_score = calc_distance_score(me.location, target.location)

    total = (
        pet_type_score
        + age_score
        + activity_score
        + personality_score
        + interest_score
        + distance_score
    )

    detail = {
        "petTypeScore": pet_type_score,
        "ageScore": age_score,
        "activityScore": activity_score,
        "personalityScore": personality_score,
        "interestScore": interest_score,
        "distanceScore": distance_score,
    }

    return {
        "score": round(total, 2),
        "detail": detail,
        "reasons": recommend_reason(detail),
    }


@app.get("/")
def root():
    return {"message": "Recommendation service is running"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    results = []

    for candidate in req.candidates:
        if candidate.id == req.currentUser.id:
            continue

        scored = calculate_match_score(req.currentUser, candidate)

        results.append({
            "id": candidate.id,
            "score": scored["score"],
            "detail": scored["detail"],
            "reasons": scored["reasons"],
        })

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "success": True,
        "recommendations": results
    }