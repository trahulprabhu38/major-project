# streamlit_app.py
import streamlit as st
import pandas as pd
import numpy as np
import os
import math
import time
import streamlit.components.v1 as components

# question-wise recommender (primary)
from modules.recommender_by_questions import (
    recommend_for_student,
    load_resources,
    INTERNAL_CO_MAP
)

# helper functions from recommender for logging/analytics
from modules.recommender import (
    init_logs, log_vote, log_feedback,
    mark_resource_completed, aggregate_votes, aggregate_feedback,
    get_resource_effectiveness, read_votes_table, read_feedback_table
)

st.set_page_config(page_title="DBMS Remediation Recommender", layout="wide")

# === Header ===
st.markdown("""
<div style="text-align:center;padding:1.5rem 0;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:16px;margin-bottom:1.5rem;box-shadow:0 8px 24px rgba(102,126,234,0.3);">
    <h1 style="color:white;margin:0;font-size:2.5rem;font-weight:700;letter-spacing:1px;">📚 DBMS Resource Recommender</h1>
    <p style="color:rgba(255,255,255,0.9);margin:0.5rem 0 0 0;font-size:1.1rem;">Personalized Learning Path for Database Management Systems</p>
</div>
""", unsafe_allow_html=True)

# === Custom CSS ===
st.markdown("""
<style>
body { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
.resource-card {
    background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 16px; padding: 1.8rem; margin: 1.2rem 0;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
    border-left: 5px solid #667eea; transition: all 0.3s ease; position: relative; overflow: hidden;
}
.resource-card:hover { transform: translateY(-4px); box-shadow: 0 15px 40px rgba(0,0,0,0.12); }
.resource-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); }
.tag { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.8rem; margin: 0.3rem 0.25rem; font-weight: 500; }
.kpi-box { background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%); border-radius: 16px; padding: 1.5rem; text-align: center; box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-top: 4px solid #667eea; }
.kpi-value { font-size: 2.2rem; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0.5rem 0; }
.description-text { color: #5a6c7d; font-size: 0.95rem; line-height: 1.6; margin: 0.8rem 0; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #667eea; }
.effectiveness-badge { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.5rem 1rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(102,126,234,0.3); }
.redirect-btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.4rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; margin-left: 0.8rem; }
.inline-preview { width: 100%; height: 280px; border: none; border-radius: 8px; margin-top: 0.8rem; }
</style>
""", unsafe_allow_html=True)

# === init logs ===
init_logs()

# === Sidebar inputs ===
st.sidebar.markdown("""
<div style="text-align:center;padding:1rem;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:12px;margin-bottom:1.5rem;">
    <h2 style="color:white;margin:0;font-size:1.2rem;font-weight:700;">🎓 Student Input</h2>
</div>
""", unsafe_allow_html=True)

student_id = st.sidebar.text_input("Student USN", value="1DS23AI001", help="Enter your University Seat Number")
internal_no = st.sidebar.selectbox("Internal Test Number", options=[1, 2, 3], index=0)
threshold_questions = st.sidebar.slider("Question Pass Threshold (out of 10)", min_value=1, max_value=10, value=5, help="Marks below this are considered weak")

st.sidebar.markdown("---")
st.sidebar.markdown("### 🤖 Recommendation Settings")
use_collaborative_filtering = st.sidebar.checkbox("Use Collaborative Filtering", value=True, 
    help="Recommend resources based on ratings from students with similar skill gaps")

if use_collaborative_filtering:
    cf_weight = st.sidebar.slider("CF Weight", min_value=0.0, max_value=1.0, value=0.7, step=0.1,
        help="Higher = more weight on similar students' ratings, Lower = more weight on content relevance")
else:
    cf_weight = 0.0

study_days = st.sidebar.number_input("Number of days for study plan", min_value=1, max_value=30, value=7)

# Get recommendations based on questions
with st.spinner("Analyzing your performance and generating recommendations..."):
    result = recommend_for_student(
        student_id, 
        internal_no, 
        threshold=threshold_questions, 
        top_k_per_co=7,
        use_cf=use_collaborative_filtering,
        cf_weight=cf_weight
    )

# Extract data
weak_questions = result.get("weak_questions", [])
co_map = result.get("co_map", {})
topic_map = result.get("topic_map", {})
recommendations = result.get("recommendations", {})

# === KPI boxes ===
col1, col2, col3, col4 = st.columns(4)
with col1:
    weak_count = len(weak_questions)
    weak_color = "#F44336" if weak_count > 0 else "#4CAF50"
    weak_text = f"{weak_count} Weak" if weak_count > 0 else "✓ All Good"
    st.markdown(f"""<div class="kpi-box"><div class="kpi-label">Questions</div><div class="kpi-value">{weak_count}</div><div class="kpi-delta" style="color:{weak_color};">{weak_text}</div></div>""", unsafe_allow_html=True)
with col2:
    resources_count = sum(len(v) for v in recommendations.values())
    st.markdown(f"""<div class="kpi-box"><div class="kpi-label">Resources</div><div class="kpi-value">{resources_count}</div><div class="kpi-delta" style="color:#667eea;">📚 Recommended</div></div>""", unsafe_allow_html=True)
with col3:
    total_time = sum(int(r.get("estimated_time_min", 0)) for items in recommendations.values() for r in items)
    hours = total_time // 60
    mins = total_time % 60
    st.markdown(f"""<div class="kpi-box"><div class="kpi-label">Study Time</div><div class="kpi-value">{hours}h {mins}m</div><div class="kpi-delta" style="color:#FF9800;">⏱️ Estimated</div></div>""", unsafe_allow_html=True)
with col4:
    cos_count = len(recommendations)
    st.markdown(f"""<div class="kpi-box"><div class="kpi-label">COs to Cover</div><div class="kpi-value">{cos_count}</div><div class="kpi-delta" style="color:#9C27B0;">🎯 Focus Areas</div></div>""", unsafe_allow_html=True)

st.markdown("---")

# === Display weak questions analysis ===
if weak_questions:
    st.subheader(f"📋 Performance Analysis for Internal {internal_no}")
    
    # Show recommendation mode
    if use_collaborative_filtering:
        st.info(f"🤖 Using **Collaborative Filtering** mode - recommendations based on ratings from students with similar skill gaps (CF weight: {cf_weight:.0%})")
    else:
        st.info("📚 Using **Content-Based** mode - recommendations based on topic relevance and difficulty")
    
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**🔴 Weak Questions Identified:**")
        st.write(", ".join([f"Q{q}" for q in weak_questions]))
    
    with col_b:
        st.markdown("**📚 Course Outcomes (COs) Affected:**")
        for co, questions in co_map.items():
            st.write(f"**{co}:** Questions {', '.join(questions)}")
    
    if topic_map:
        st.markdown("**📖 Topics to Focus On:**")
        topics_list = list(topic_map.keys())
        st.write(", ".join(topics_list))
else:
    st.success("🎉 Great job! No weak areas detected. Keep up the excellent work!")
    st.stop()

st.markdown("---")

# === Study plan generator ===
st.header("📅 Personalized Study Plan")
def generate_study_plan(recommendations_dict, study_days=7):
    total_time = sum(r.get("estimated_time_min", 0) for items in recommendations_dict.values() for r in items)
    if total_time == 0:
        st.info("No estimated times available to generate a study plan.")
        return
    hours_per_day_needed = total_time / (study_days * 60)
    st.info(f"To complete all resources in **{int(study_days)} days**, you'll need approximately **{hours_per_day_needed:.1f} hours/day**.")
    schedule = {}
    current_day = 1
    daily_time = 0
    max_daily_minutes = (total_time / study_days) if study_days > 0 else total_time
    for co, resources_list in recommendations_dict.items():
        for resource in resources_list:
            duration = int(resource.get("estimated_time_min", 30))
            if daily_time + duration > max_daily_minutes and current_day < study_days:
                current_day += 1
                daily_time = 0
            schedule.setdefault(current_day, []).append({"resource": resource, "co": co})
            daily_time += duration
    for day, items in schedule.items():
        total_day_min = sum(int(r['resource'].get('estimated_time_min', 0)) for r in items)
        with st.expander(f"📆 Day {day} ({total_day_min} minutes)"):
            for item in items:
                st.markdown(f"- **{item['resource']['title']}** ({item['co']}) - {item['resource']['estimated_time_min']} min")

generate_study_plan(recommendations, study_days=study_days)
st.markdown("---")

# === display_resource_card (adapted, re-usable) ===
def display_resource_card(resource, student_id, card_index, show_cf_info=False):
    rid = resource.get("resource_id", "")
    title = resource.get("title", "")
    url = resource.get("url", "")
    rtype = resource.get("type", resource.get("rtype",""))
    diff = str(resource.get("difficulty", "")).lower()
    topic = resource.get("topic", "")
    description = resource.get("description", "No description available.")
    votes_df = aggregate_votes()
    feedback_df = aggregate_feedback()
    effectiveness = get_resource_effectiveness(rid, votes_df, feedback_df)
    diff_colors = {"easy": "#4CAF50", "medium": "#FF9800", "hard": "#F44336"}
    diff_color = diff_colors.get(diff, "#757575")
    
    # CF-specific information
    cf_rating = resource.get('cf_rating', None)
    num_similar = resource.get('num_similar_students', None)
    hybrid_score = resource.get('hybrid_score', None)
    
    card_html = f"""
    <div class="resource-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;margin-bottom:0.5rem;">
            <h3 style="margin:0;font-size:1.2rem;font-weight:600;color:#0b57d0;">{title}</h3>
            <a href="{url}" target="_blank" class="redirect-btn">🔗 Open Resource</a>
          </div>
          <p style="margin:0.3rem 0 0.5rem 0;color:#5a6c7d;font-size:0.95rem;"><strong>Topic:</strong> {topic}</p>
          <div style="margin-top:0.6rem;">
            <span class="tag" style="background:{diff_color}22;color:{diff_color};border:1px solid {diff_color}44;">{diff.capitalize()}</span>
            <span class="tag" style="background:#E3F2FD;color:#1976D2;border:1px solid #90CAF9;">{rtype}</span>
    """
    
    # Add CF badges if available
    if show_cf_info and cf_rating is not None:
        cf_percentage = cf_rating * 100
        cf_color = "#4CAF50" if cf_rating > 0.7 else "#FF9800" if cf_rating > 0.4 else "#F44336"
        card_html += f'<span class="tag" style="background:{cf_color}22;color:{cf_color};border:1px solid {cf_color}44;">👥 {cf_percentage:.0f}% rated by similar students</span>'
    
    if show_cf_info and num_similar is not None and num_similar > 0:
        card_html += f'<span class="tag" style="background:#9C27B022;color:#9C27B0;border:1px solid #9C27B044;">📊 {num_similar} similar students</span>'
    
    card_html += f"""
          </div>
        </div>
        <div class="effectiveness-badge" style="text-align:center;min-width:90px;">
          <div style="font-size:1.2rem;font-weight:700;">{effectiveness:.1f}</div>
          <div style="font-size:0.7rem;opacity:0.95;">/ 5.0</div>
        </div>
      </div>
      <div class="description-text">{description}</div>
    """
    
    # Show hybrid score if CF is enabled
    if show_cf_info and hybrid_score is not None:
        card_html += f'<div style="margin-top:0.5rem;padding:0.5rem;background:#E8EAF6;border-radius:6px;font-size:0.85rem;color:#5E35B1;">🎯 Recommendation Score: {hybrid_score:.2f}/1.0</div>'
    
    # embed preview for youtube only
    if isinstance(url, str) and ("youtube.com" in url or "youtu.be" in url):
        card_html += '</div>'
        st.markdown(card_html, unsafe_allow_html=True)
        try:
            col1, col2, col3 = st.columns([0.5,3,0.5])
            with col2:
                st.video(url)
        except:
            st.info("Preview not available. Use the Open Resource button.")
    else:
        # For non-YouTube resources, just close the card without iframe preview
        card_html += '</div>'
        st.markdown(card_html, unsafe_allow_html=True)
    # interaction row
    c1, c2, c3 = st.columns([1,1,1])
    with c1:
        if st.button("👍 Upvote", key=f"upvote_{card_index}", use_container_width=True):
            log_vote(student_id, rid, 1)
            st.success("Upvoted — saved")
    with c2:
        if st.button("👎 Downvote", key=f"downvote_{card_index}", use_container_width=True):
            log_vote(student_id, rid, -1)
            st.warning("Downvoted — saved")
    with c3:
        if st.button("✅ Mark as Completed", key=f"complete_{card_index}", use_container_width=True):
            mark_resource_completed(student_id, rid)
            st.balloons()
            st.success("Marked as completed!")
    with st.expander("📝 Give feedback / rating"):
        rating = st.slider("Rate this resource (1-5)", 1, 5, 5, key=f"rate_{card_index}")
        comment = st.text_area("Comment (optional - for teacher analysis)", key=f"comm_{card_index}", placeholder="What helped? Anything missing?")
        if st.button("Submit feedback", key=f"fb_{card_index}", use_container_width=True):
            log_feedback(student_id, rid, rating, comment)
            st.success("Feedback saved — thank you!")

# === Show recommendations by CO ===
card_counter = 0
for co, items in recommendations.items():
    st.header(f"📚 Recommendations for {co}")
    if not items:
        st.write("No resources found for this CO.")
        continue
    
    # Show which questions this CO addresses
    if co in co_map:
        st.info(f"This addresses your weak questions: {', '.join([f'Q{q}' for q in co_map[co]])}")
    
    for it in items:
        display_resource_card(it, student_id, f"rec_{co}_{card_counter}", show_cf_info=use_collaborative_filtering)
        card_counter += 1
    st.markdown("---")

# === Teacher/Admin analytics ===
st.sidebar.markdown("---")
if st.sidebar.checkbox("Show teacher analytics"):
    st.subheader("Teacher / Admin Analytics")
    votes = read_votes_table()
    feedback = read_feedback_table()
    st.markdown("### Aggregated votes")
    st.dataframe(votes.sort_values("timestamp", ascending=False).head(200))
    st.markdown("### Aggregated feedback")
    st.dataframe(feedback.sort_values("timestamp", ascending=False).head(200))
    st.markdown("### Top resources by feedback")
    agg_fb = aggregate_feedback()
    if not agg_fb.empty:
        resources_all = load_resources()
        merged = agg_fb.merge(resources_all[["resource_id","title"]], on="resource_id", how="left")
        st.dataframe(merged.sort_values("rating_mean", ascending=False).head(30))
