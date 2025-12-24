# modules/recommender_by_questions.py
import os
import glob
import pandas as pd
import numpy as np
import re

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.path.join(BASE_DIR, "data")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

QUESTION_MAP_PATH = os.path.join(DATA_DIR, "question_map_inferred.csv")
RESOURCES_PATH = os.path.join(DATA_DIR, "resources.csv")
VOTES_CSV = os.path.join(LOGS_DIR, "votes.csv")
FEEDBACK_CSV = os.path.join(LOGS_DIR, "feedback.csv")

DEFAULT_THRESHOLD = 5  # question-level threshold (student mark < 5 or NaN => weak)

# CO mapping per internal (explicit, as you confirmed)
INTERNAL_CO_MAP = {
    1: { "1":"CO1","2":"CO4","3":"CO2","4":"CO2","5":"CO1","6":"CO1","7":"CO4","8":"CO4" },
    2: { "1":"CO4","2":"CO3","3":"CO4","4":"CO4","5":"CO4","6":"CO4","7":"CO3","8":"CO3" },
    3: { "1":"CO3","2":"CO5","3":"CO3","4":"CO3","5":"CO5","6":"CO5","7":"CO5","8":"CO5" }
}

# OR pairs (per your rule): for each internal these question pairs are optional: if either answered -> OK
OR_PAIRS = [(3,4), (5,6), (7,8)]  # applies to all internals per your description

# -------------------------
# File helpers
# -------------------------
def load_question_map(path=QUESTION_MAP_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Question map not found at: {path}")
    df = pd.read_csv(path, dtype=str).fillna("")
    df["internal"] = df["internal"].astype(int)
    return df[["internal","question","co","topic"]]

def load_resources(path=RESOURCES_PATH):
    if not os.path.exists(path):
        # return empty schema
        cols = ["resource_id","title","url","CO","topic","estimated_time_min","difficulty","description","type"]
        return pd.DataFrame(columns=cols)
    df = pd.read_csv(path)
    # ensure columns
    for c in ["resource_id","title","url","CO","topic","estimated_time_min","difficulty","description","type"]:
        if c not in df.columns:
            df[c] = ""
    df["CO"] = df["CO"].astype(str)
    df["topic"] = df["topic"].astype(str)
    df["difficulty"] = df["difficulty"].fillna("medium").astype(str)
    df["type"] = df["type"].fillna("video").astype(str)
    df["estimated_time_min"] = pd.to_numeric(df["estimated_time_min"], errors="coerce").fillna(30).astype(int)
    return df

def find_marks_file_for_internal(internal_no):
    patterns = [
        f"*cie{internal_no}*.csv", f"*cie_{internal_no}*.csv", f"*cie-{internal_no}*.csv",
        f"*CIE{internal_no}*.csv", f"*ia{internal_no}*.csv", f"*internal{internal_no}*.csv",
        f"*cie{internal_no}*.xlsx", f"*IA{internal_no}*.xlsx"
    ]
    candidates = []
    for p in patterns:
        candidates.extend(glob.glob(os.path.join(DATA_DIR, p)))
    candidates = sorted(set(candidates))
    return candidates[0] if candidates else None

def load_marks_table(path):
    if path is None:
        return None
    if path.lower().endswith(".csv"):
        # Skip first 2 header rows, use 3rd row as column names
        return pd.read_csv(path, dtype=object, skiprows=2)
    else:
        return pd.read_excel(path, dtype=object, skiprows=2)

# -------------------------
# Effectiveness fallback
# -------------------------
def _read_csv_safe(p):
    if not os.path.exists(p):
        return pd.DataFrame()
    try:
        return pd.read_csv(p)
    except:
        return pd.DataFrame()

def compute_basic_effectiveness(resource_id):
    fb = _read_csv_safe(FEEDBACK_CSV)
    v = _read_csv_safe(VOTES_CSV)
    rid = str(resource_id)
    if not fb.empty:
        sub = fb[fb["resource_id"].astype(str) == rid]
        if not sub.empty and "rating" in sub.columns:
            try:
                mean_rating = float(sub["rating"].dropna().astype(float).mean())
                return max(0.0, min(1.0, (mean_rating - 1.0) / 4.0))
            except:
                pass
    if not v.empty:
        subv = v[v["resource_id"].astype(str) == rid]
        if not subv.empty and "vote" in subv.columns:
            try:
                avgv = float(subv["vote"].dropna().astype(float).mean())  # -1..1
                return (avgv + 1.0) / 2.0
            except:
                pass
    return 0.5

# -------------------------
# Core detection: weak questions given student and internal
# -------------------------
def _match_column_for_question(df_marks, question_token):
    """
    Find the actual column in marks table that corresponds to question token.
    For question '1', looks for Q1A and Q1B columns.
    Returns list of matching column names.
    """
    q = str(question_token).strip()
    cols = list(df_marks.columns)
    matching_cols = []
    
    # Look for Q{num}A, Q{num}B, Q{num}a, Q{num}b patterns
    patterns = [f"Q{q}A", f"Q{q}B", f"Q{q}a", f"Q{q}b", f"q{q}a", f"q{q}b", f"q{q}A", f"q{q}B"]
    
    for col in cols:
        col_str = str(col).strip()
        if col_str in patterns:
            matching_cols.append(col)
        # Also check without Q prefix but with A/B suffix
        elif col_str in [f"{q}A", f"{q}B", f"{q}a", f"{q}b"]:
            matching_cols.append(col)
    
    return matching_cols if matching_cols else None

def detect_weak_questions(student_id, internal_no, threshold=DEFAULT_THRESHOLD):
    """
    Returns list of question tokens that the student is weak in (NaN or < threshold),
    but respects OR-pairs: if either question of an OR pair is OK => don't mark that pair's CO as weak.
    """
    marks_file = find_marks_file_for_internal(internal_no)
    if marks_file is None:
        return []  # cannot find marks data
    
    df_marks = load_marks_table(marks_file)
    if df_marks is None or df_marks.empty:
        return []
    
    # detect student id column (USN column)
    id_cols = ["USN", "usn", "student_id", "id", "roll", "rollno", "roll_no", "student"]
    id_col = next((c for c in df_marks.columns if c in id_cols), None)
    
    if id_col is None:
        # Try to find any column that might be USN (usually second column after Sl No.)
        if len(df_marks.columns) > 1:
            id_col = df_marks.columns[1]
        else:
            return []
    
    # find row - try exact match first
    mask = df_marks[id_col].astype(str).str.strip().str.upper() == str(student_id).strip().upper()
    
    if mask.sum() == 0:
        # try contains
        mask = df_marks[id_col].astype(str).str.upper().str.contains(str(student_id).strip().upper(), na=False)
    
    if mask.sum() == 0:
        return []
    
    row = df_marks[mask].iloc[0]
    
    # process each question mapped for this internal
    q_map = INTERNAL_CO_MAP.get(int(internal_no), {})
    weak_questions = set()
    
    # first detect raw weak flags per question
    question_flags = {}
    for qtoken in q_map.keys():
        cols = _match_column_for_question(df_marks, str(qtoken))
        
        if cols is None or len(cols) == 0:
            # No columns found for this question - treat as unanswered (weak)
            question_flags[int(qtoken)] = np.nan
        else:
            # Get scores from all parts (A, B, etc.) and take the maximum
            scores = []
            for col in cols:
                raw = row[col]
                if pd.isna(raw) or str(raw).strip() in ["", "nan", "na", "none", "None"]:
                    scores.append(np.nan)
                else:
                    try:
                        scores.append(float(raw))
                    except:
                        # non-numeric -> treat as 0
                        scores.append(0.0)
            
            # Take max score across all parts, or NaN if all are NaN
            valid_scores = [s for s in scores if not pd.isna(s)]
            if len(valid_scores) > 0:
                question_flags[int(qtoken)] = max(valid_scores)
            else:
                question_flags[int(qtoken)] = np.nan
    
    # apply OR pair logic:
    # Q1 and Q2 are compulsory — always checked individually.
    # For (3,4),(5,6),(7,8): if either >= threshold -> pair is OK (no reco for that CO)
    # else if both < threshold/NaN -> mark both questions as weak (we'll map to CO)
    
    # Start by handling compulsory Q1 and Q2
    for q in [1, 2]:
        v = question_flags.get(q, np.nan)
        if pd.isna(v) or v < threshold:
            weak_questions.add(str(q))
    
    # handle OR pairs
    for a, b in OR_PAIRS:
        a_val = question_flags.get(a, np.nan)
        b_val = question_flags.get(b, np.nan)
        a_ok = (not pd.isna(a_val)) and (a_val >= threshold)
        b_ok = (not pd.isna(b_val)) and (b_val >= threshold)
        if not (a_ok or b_ok):
            # neither answered/up to threshold => mark the pair's CO as needing help.
            if str(a) in q_map:
                weak_questions.add(str(a))
            if str(b) in q_map:
                weak_questions.add(str(b))
    
    # final: return sorted list
    return sorted(list(weak_questions), key=lambda x: int(x))

# -------------------------
# Map questions -> COs & topics
# -------------------------
def map_questions_to_cos_topics(question_list, internal_no):
    qm = load_question_map()
    qm_i = qm[qm["internal"] == int(internal_no)]
    res_co = {}
    res_topic = {}
    for q in question_list:
        q = str(q)
        row = qm_i[qm_i["question"].astype(str) == q]
        if row.empty:
            # try startswith
            row = qm_i[qm_i["question"].astype(str).str.startswith(q)]
        if row.empty:
            continue
        co = row.iloc[0]["co"]
        topic = row.iloc[0]["topic"]
        res_co.setdefault(co, []).append(q)
        res_topic.setdefault(topic, []).append(q)
    return set(res_co.keys()), res_co, set(res_topic.keys()), res_topic

# -------------------------
# Resource selection & ranking
# -------------------------
def _read_csv(p):
    if not os.path.exists(p):
        return pd.DataFrame()
    try:
        return pd.read_csv(p)
    except:
        return pd.DataFrame()

def _effectiveness_for_resource(rid):
    return compute_basic_effectiveness(rid)

def rank_resources_for_co(resources_df, co, preferred_topics, top_k=7):
    df = resources_df[resources_df["CO"].astype(str).str.strip().str.upper() == str(co).strip().upper()].copy()
    if df.empty:
        return []
    # topic match flag
    pref_set = set([t.strip().lower() for t in (preferred_topics or [])])
    df["_topic_match"] = df["topic"].astype(str).apply(lambda t: 1 if str(t).strip().lower() in pref_set else 0)
    diff_order = {"easy":0,"medium":1,"hard":2}
    df["_diffval"] = df["difficulty"].astype(str).apply(lambda d: diff_order.get(str(d).lower(),1))
    df["_effectiveness"] = df["resource_id"].apply(lambda r: _effectiveness_for_resource(r))
    df_sorted = df.sort_values(by=["_topic_match","_diffval","estimated_time_min","_effectiveness"], ascending=[False, True, True, False])
    out = []
    for _, r in df_sorted.head(top_k).iterrows():
        out.append({
            "resource_id": r["resource_id"],
            "title": r.get("title",""),
            "url": r.get("url",""),
            "CO": r.get("CO",""),
            "topic": r.get("topic",""),
            "estimated_time_min": int(r.get("estimated_time_min",30)),
            "difficulty": r.get("difficulty",""),
            "description": r.get("description",""),
            "effectiveness": float(r.get("_effectiveness",0.5))
        })
    return out

# -------------------------
# Top-level recommend API
# -------------------------
def recommend_for_student(student_id, internal_no, threshold=DEFAULT_THRESHOLD, top_k_per_co=7, use_cf=False, cf_weight=0.7):
    """
    Returns a dict:
      - student_id, internal_no, weak_questions, co_map(topic->questions), recommendations (co -> list(resources))
    
    Args:
        use_cf: If True, use collaborative filtering (CF) based recommendations
        cf_weight: Weight for CF score in hybrid mode (0-1)
    """
    internal_no = int(internal_no)
    # detect weak questions
    weak_qs = detect_weak_questions(student_id, internal_no, threshold=threshold)
    if not weak_qs:
        return {
            "student_id": student_id,
            "internal_no": internal_no,
            "weak_questions": [],
            "co_map": {},
            "topic_map": {},
            "recommendations": {}
        }
    # map to COs/topics
    cos, co_map, topics, topic_map = map_questions_to_cos_topics(weak_qs, internal_no)
    resources_df = load_resources()
    
    if use_cf:
        # Use collaborative filtering recommendations
        from modules.collaborative_filtering import hybrid_recommend
        recommendations = hybrid_recommend(
            student_id, weak_qs, internal_no, co_map, topic_map, 
            resources_df, top_k_per_co, cf_weight
        )
    else:
        # Use content-based recommendations (original logic)
        recommendations = {}
        for co in cos:
            # find relevant topics for this CO
            co_topics = set()
            for t, qs in topic_map.items():
                # check if any of those questions map to this CO
                qm = load_question_map()
                # check each question
                for q in qs:
                    row = qm[(qm["internal"]==internal_no) & (qm["question"].astype(str)==str(q))]
                    if not row.empty and row.iloc[0]["co"] == co:
                        co_topics.add(t)
            if len(co_topics) == 0:
                co_topics = set(topic_map.keys())
            recs = rank_resources_for_co(resources_df, co, preferred_topics=co_topics, top_k=top_k_per_co)
            recommendations[co] = recs
    
    return {
        "student_id": student_id,
        "internal_no": internal_no,
        "weak_questions": weak_qs,
        "co_map": co_map,
        "topic_map": topic_map,
        "recommendations": recommendations
    }
