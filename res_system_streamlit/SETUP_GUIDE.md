# DBMS Recommender System - Setup Guide

## Prerequisites
- Python 3.9 or higher
- Windows/Mac/Linux

## Step 1: Clone/Transfer Project
Transfer the entire `dbms_recommender_project` folder to your new computer.

## Step 2: Create Virtual Environment
```bash
# Windows
python -m venv reco
.\reco\Scripts\activate

# Mac/Linux
python3 -m venv reco
source reco/bin/activate
```

## Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

## Step 4: Verify Data Files
Ensure these files exist in the `data/` folder:
- `DBMS MARKS - cie1marks (1).csv`
- `DBMS MARKS - cie2marks (1).csv`
- `DBMS MARKS - cie3marks (1).csv`
- `question_map_inferred.csv`
- `resources.csv`

## Step 5: Initialize Logs (Optional)
The system will auto-create these in `logs/` on first run:
- `votes.csv`
- `feedback.csv`
- `completed.csv`

## Step 6: Run the Application
```bash
streamlit run streamlit_app.py
```

The app will open in your browser at `http://localhost:8501`

## Testing (Optional)
Run the ML collaborative filtering test:
```bash
python test_ml_cf.py
```

## Troubleshooting

### Issue: ModuleNotFoundError
**Solution**: Ensure virtual environment is activated and all packages are installed.

### Issue: CSV File Not Found
**Solution**: Check that all CSV files are in the `data/` folder with exact names.

### Issue: XGBoost Installation Failed
**Solution**: 
- Windows: Install Visual C++ Build Tools
- Mac: `brew install libomp`
- Try: `pip install xgboost --no-cache-dir`

## Project Structure
```
dbms_recommender_project/
├── data/                       # Input CSV files
├── logs/                       # User interaction logs
├── modules/                    # Core recommendation engine
│   ├── recommender.py
│   ├── recommender_by_questions.py
│   └── collaborative_filtering.py
├── reco/                       # Virtual environment
├── streamlit_app.py           # Main application
├── requirements.txt           # Dependencies
└── SETUP_GUIDE.md            # This file
```

## Features
- **Question-based recommendation**: Analyzes weak questions from internal test marks
- **ML-powered collaborative filtering**: Uses K-Means clustering and XGBoost
- **Hybrid scoring**: Combines content-based and collaborative filtering
- **Interactive UI**: Streamlit-based with voting, rating, and feedback
- **Resource effectiveness tracking**: Based on user ratings (1-5 stars)

## Support
For issues, check:
1. Python version: `python --version` (should be 3.9+)
2. Virtual environment activated: prompt shows `(reco)`
3. All dependencies installed: `pip list`
4. Data files present in `data/` folder
