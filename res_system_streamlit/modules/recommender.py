# modules/recommender.py
import pandas as pd
import numpy as np
from datetime import datetime
import os

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.path.join(BASE_DIR, "data")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

RESOURCES_PATH = os.path.join(DATA_DIR, "resources.csv")
VOTES_CSV = os.path.join(LOGS_DIR, "votes.csv")
FEEDBACK_CSV = os.path.join(LOGS_DIR, "feedback.csv")
COMPLETED_CSV = os.path.join(LOGS_DIR, "completed.csv")
TESTS_CSV = os.path.join(DATA_DIR, "tests.csv")  # optional: history of tests (student_id, timestamp, internal, score)

# Internal -> CO mapping (explicit)
INTERNAL_TO_COS = {
    1: ["CO1","CO2"],
    2: ["CO3","CO4"],
    3: ["CO5","CO6"]
}

# -------------------------
# Resource loading & selection
# -------------------------
def load_resources():
    df = pd.read_csv(RESOURCES_PATH)
    # ensure columns
    for c in ["resource_id","title","url","type","CO","topic","estimated_time_min","difficulty","description"]:
        if c not in df.columns:
            df[c] = ""
    # normalize difficulty
    df["difficulty"] = df["difficulty"].fillna("medium").astype(str)
    df["type"] = df["type"].fillna("video").astype(str)
    # add default description if missing
    df["description"] = df["description"].fillna("No description available.")
    return df

def rule_based_level(score, threshold=50):
    diff = threshold - score
    if diff <= 0:
        return 0
    if diff <= 5:
        return 1
    if diff <= 20:
        return 2
    return 3

def select_resources_by_level(resources_df, cos, level, top_k_per_co=7):
    """Return dict CO -> list of resource dicts filtered/sorted by level."""
    out = {}
    for co in cos:
        subset = resources_df[resources_df["CO"] == co].copy()
        if subset.empty:
            out[co] = []
            continue
        if level == 1:
            filt = subset[subset["difficulty"].str.lower()=="easy"]
        elif level == 2:
            filt = subset[subset["difficulty"].str.lower().isin(["easy","medium"])]
        else:
            filt = subset
        # sort by difficulty (easy first) then estimated_time_min ascending
        def diff_sort_val(x):
            m = {"easy":0,"medium":1,"hard":2}
            return m.get(str(x).lower(),1)
        filt["diff_val"] = filt["difficulty"].apply(diff_sort_val)
        filt = filt.sort_values(["diff_val","estimated_time_min"])
        chosen = filt.head(top_k_per_co).to_dict("records")
        out[co] = chosen
    return out

# -------------------------
# Logs initialization + helpers
# -------------------------
def init_logs():
    os.makedirs(LOGS_DIR, exist_ok=True)
    if not os.path.exists(VOTES_CSV):
        pd.DataFrame(columns=["timestamp","student_id","resource_id","vote"]).to_csv(VOTES_CSV,index=False)
    if not os.path.exists(FEEDBACK_CSV):
        pd.DataFrame(columns=["student_id","resource_id","rating","comment","timestamp"]).to_csv(FEEDBACK_CSV,index=False)
    if not os.path.exists(COMPLETED_CSV):
        pd.DataFrame(columns=["timestamp","student_id","resource_id"]).to_csv(COMPLETED_CSV,index=False)
    # tests.csv is optional; we don't create it automatically

def log_vote(student_id, resource_id, vote):
    # vote: +1 or -1
    init_logs()
    df = pd.DataFrame([{
        "timestamp": datetime.utcnow().isoformat(),
        "student_id": student_id,
        "resource_id": resource_id,
        "vote": int(vote)
    }])
    df.to_csv(VOTES_CSV, mode="a", header=False, index=False)

def log_feedback(student_id, resource_id, rating, comment):
    init_logs()
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    df = pd.DataFrame([{
        "student_id": student_id,
        "resource_id": resource_id,
        "rating": int(rating),
        "comment": comment if comment else "",
        "timestamp": timestamp
    }])
    df.to_csv(FEEDBACK_CSV, mode="a", header=False, index=False)

def mark_resource_completed(student_id, resource_id):
    init_logs()
    df = pd.DataFrame([{
        "timestamp": datetime.utcnow().isoformat(),
        "student_id": student_id,
        "resource_id": resource_id
    }])
    df.to_csv(COMPLETED_CSV, mode="a", header=False, index=False)

# -------------------------
# Aggregation & analytics helpers
# -------------------------
def aggregate_votes():
    init_logs()
    v = pd.read_csv(VOTES_CSV)
    if v.empty:
        return pd.DataFrame(columns=["resource_id","votes_sum","votes_count","votes_avg"])
    
    # Ensure vote column is numeric
    v['vote'] = pd.to_numeric(v['vote'], errors='coerce')
    v = v.dropna(subset=['vote'])
    
    if v.empty:
        return pd.DataFrame(columns=["resource_id","votes_sum","votes_count","votes_avg"])
    
    agg = v.groupby("resource_id")["vote"].agg(["sum","count"]).reset_index().rename(columns={"sum":"votes_sum","count":"votes_count"})
    agg["votes_avg"] = agg["votes_sum"]/agg["votes_count"]
    return agg

def aggregate_feedback():
    init_logs()
    f = pd.read_csv(FEEDBACK_CSV)
    if f.empty:
        return pd.DataFrame(columns=["resource_id","rating_mean","rating_count"])
    
    # Ensure rating column is numeric
    f['rating'] = pd.to_numeric(f['rating'], errors='coerce')
    
    # Drop rows with invalid data
    f = f.dropna(subset=['rating'])
    
    if f.empty:
        return pd.DataFrame(columns=["resource_id","rating_mean","rating_count"])
    
    agg = f.groupby("resource_id").agg({"rating":["mean","count"]}).reset_index()
    agg.columns = ["resource_id","rating_mean","rating_count"]
    return agg

def get_resource_effectiveness(resource_id, votes_df=None, feedback_df=None):
    """Return a 0..5 effectiveness score. Uses rating_mean (if available), else map votes_avg -> 0..5."""
    if votes_df is None:
        votes_df = aggregate_votes()
    if feedback_df is None:
        feedback_df = aggregate_feedback()
    # prefer explicit ratings
    fb = feedback_df[feedback_df["resource_id"]==resource_id]
    if not fb.empty and not np.isnan(fb.iloc[0]["rating_mean"]):
        mean_rating = fb.iloc[0]["rating_mean"]
        return float(mean_rating)
    # fallback to votes average mapped from [-1,1] to [2.5,5.0] (weak mapping)
    v = votes_df[votes_df["resource_id"]==resource_id]
    if not v.empty and not np.isnan(v.iloc[0]["votes_avg"]):
        val = v.iloc[0]["votes_avg"]  # -1..1
        # map -1..1 to 1..5
        eff = 1 + 4 * ((val + 1) / 2)
        return float(eff)
    # default neutral value
    return 3.0

def get_success_rate(resource_id):
    """Estimate percent of students who self-reported improvement > 0 after using the resource."""
    init_logs()
    if not os.path.exists(FEEDBACK_CSV):
        return 0
    f = pd.read_csv(FEEDBACK_CSV)
    if f.empty:
        return 0
    sub = f[f["resource_id"]==resource_id]
    if sub.empty:
        return 0
    positive = (sub["self_reported_improvement"] > 0).sum()
    rate = int(round(100.0 * positive / len(sub)))
    return int(rate)

def calculate_expected_improvement(selected_resources):
    """Rudimentary expected improvement: mean of avg_self_reported_improvement across chosen resources (or fallback)."""
    fb = aggregate_feedback()
    improvements = []
    for co, items in selected_resources.items():
        for it in items:
            rid = it.get("resource_id")
            row = fb[fb["resource_id"]==rid]
            if not row.empty and not np.isnan(row.iloc[0]["avg_self_reported_improvement"]):
                improvements.append(float(row.iloc[0]["avg_self_reported_improvement"]))
    if improvements:
        return int(round(np.mean(improvements)))
    # fallback heuristic: number of resources -> small improvement
    total = sum(len(v) for v in selected_resources.values())
    est = min(30, int(round(total * 2)))  # e.g., 5 resources -> ~10%
    return est

# -------------------------
# Student progress / learning trajectory
# -------------------------
def get_learning_trajectory(student_id):
    """
    Returns a DataFrame with columns ['timestamp','score'] if data available.
    We prefer to read data/data/tests.csv which should contain historical test scores:
    Columns expected: student_id, timestamp, internal_no, score
    If tests.csv not present or empty, return empty df.
    """
    if not os.path.exists(TESTS_CSV):
        return pd.DataFrame(columns=["timestamp","score"])
    df = pd.read_csv(TESTS_CSV, parse_dates=["timestamp"])
    df = df[df["student_id"] == student_id].copy()
    if df.empty:
        return pd.DataFrame(columns=["timestamp","score"])
    df = df.sort_values("timestamp")
    # keep only timestamp and score
    df_short = df[["timestamp","score"]].reset_index(drop=True)
    return df_short

# -------------------------
# Export helpers (for teacher view)
# -------------------------
def read_votes_table():
    init_logs()
    return pd.read_csv(VOTES_CSV)

def read_feedback_table():
    init_logs()
    return pd.read_csv(FEEDBACK_CSV)

def read_completed_table():
    init_logs()
    return pd.read_csv(COMPLETED_CSV)
