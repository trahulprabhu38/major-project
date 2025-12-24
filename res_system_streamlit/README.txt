
DBMS Remediation Recommender - Project
=====================================

Project structure:
- streamlit_app.py  -> main Streamlit app
- modules/recommender.py -> recommender logic, logging helpers
- data/resources.xlsx -> resource bank (copied from assistant-created file)
- logs/ -> will store votes.csv and feedback.csv as users interact
- requirements.txt

How it works:
- Input student_id, internal number (1..3), and score.
- App maps internal to COs: Internal1->CO1,CO2 ; Internal2->CO3,CO4 ; Internal3->CO5,CO6
- Rule-based severity determines which difficulty resources to recommend:
    0: none, 1: easy only, 2: easy+medium, 3: all resources
- Students can upvote/downvote resources and submit ratings/comments + self-reported improvement.
- Votes and feedback are appended to logs/votes.csv and logs/feedback.csv for later collaborative filtering or analytics.

Run locally:
1. pip install -r requirements.txt
2. streamlit run streamlit_app.py

Notes:
- The project intentionally separates recommendation logic (modules/recommender.py) from the UI for clarity and future extension.
- You can later add a training script to use logs/feedback.csv and logs/votes.csv to build collaborative filtering models.
