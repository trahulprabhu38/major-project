# Quick Start Guide: Collaborative Filtering

## 🚀 How to Run

```bash
# Activate virtual environment
.\reco\Scripts\activate

# Run the Streamlit app
streamlit run streamlit_app.py
```

## 📋 How to Use Collaborative Filtering

### Step 1: Enable CF Mode
- Open sidebar
- Check ✅ **"Use Collaborative Filtering"**

### Step 2: Adjust Settings (Optional)
- **CF Weight Slider**: 
  - 0.7 (default) = 70% from similar students, 30% from content
  - 1.0 = 100% collaborative (pure CF)
  - 0.0 = 100% content-based (no CF)

### Step 3: Enter Your Details
- **Student USN**: e.g., 1DS23AI001
- **Internal Test**: 1, 2, or 3
- **Threshold**: Minimum marks (default: 5)

### Step 4: View Recommendations
Resources will show CF-specific info:
- 👥 **Rating from similar students** (0-100%)
- 📊 **Number of similar students** who rated
- 🎯 **Hybrid score** (combined CF + content)

### Step 5: Help Others!
**Rate resources** to improve recommendations for future students:
- 👍 Upvote helpful resources
- 👎 Downvote unhelpful ones
- ⭐ Give detailed feedback (1-5 stars)
- ✅ Mark as completed

## 📊 Understanding the Scores

### CF Rating (👥)
- **70-100%** = 🟢 Highly rated by similar students
- **40-69%** = 🟡 Moderately rated
- **0-39%** = 🔴 Lower rated

### Similar Students (📊)
- Shows how many students with similar skill gaps rated this
- More students = more reliable rating

### Hybrid Score (🎯)
- 0.8-1.0 = Excellent recommendation
- 0.6-0.8 = Good recommendation
- 0.4-0.6 = Moderate recommendation
- < 0.4 = Consider other options

## 🔄 How the System Learns

```
You rate a resource
    ↓
System stores your rating
    ↓
Future students with similar gaps see your rating
    ↓
More accurate recommendations for everyone!
```

## 🎯 Best Practices

1. **Rate Honestly**: Help others by giving accurate feedback
2. **Complete Resources**: Mark completed to show effectiveness
3. **Use Comments**: Explain what helped or didn't help
4. **Adjust CF Weight**: 
   - High weight (0.8-1.0) when you trust peer ratings
   - Low weight (0.3-0.5) when you want content-focused picks

## 🆚 CF vs Content-Based

| Feature | Collaborative Filtering | Content-Based |
|---------|------------------------|---------------|
| Basis | Similar students' ratings | Topic match & difficulty |
| Strength | Real effectiveness data | Always available |
| Weakness | Needs historical data | No peer validation |
| Best For | Courses with many students | New courses |

## 💡 Tips

- **First time?** Start with CF enabled (default)
- **No similar students?** System automatically falls back to content-based
- **Want both?** Use CF weight around 0.5-0.7 for balance
- **Trust the crowd?** Use CF weight 0.8+ for peer-driven picks

## 🐛 Troubleshooting

**No CF ratings showing?**
- Check if "Use Collaborative Filtering" is enabled
- System may be in fallback mode (no historical data yet)
- Try rating some resources to build the database

**Resources seem random?**
- Lower CF weight to increase content relevance
- Or disable CF to use pure content-based mode

**Want to see raw data?**
- Enable "Show teacher analytics" in sidebar
- View all votes and feedback data

## 📞 Need Help?

Check these files:
- `COLLABORATIVE_FILTERING.md` - Detailed algorithm docs
- `CF_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `modules/collaborative_filtering.py` - Source code
