import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import streamlit as st
import pandas as pd
from services.extractor import extract_text
from services.embeddings import add_to_db, search_in_db
from co_generator import generate_cos

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

st.set_page_config(page_title="CO/PO Document Manager", layout="wide")
st.title("📘 CO/PO Knowledge Upload & Query System")

# Sidebar
st.sidebar.header("Navigation")
page = st.sidebar.radio("Go to", ["Upload Files", "Search CO/PO"])

# ---------------------------- UPLOAD PAGE ----------------------------
if page == "Upload Files":
    st.subheader("📂 Upload Course Documents")
    uploaded_files = st.file_uploader(
        "Upload PDF, DOCX, or PPTX files", 
        type=["pdf", "docx", "pptx"], 
        accept_multiple_files=True
    )

    if uploaded_files:
        texts = []
        results = []

        for file in uploaded_files:
            path = os.path.join(UPLOAD_DIR, file.name)
            with open(path, "wb") as f:
                f.write(file.read())
            text = extract_text(path)
            texts.append(text)
            add_to_db(file.name, text)
            results.append({"File": file.name, "Text Snippet": text[:300] + "..."})

        st.success("✅ Files uploaded and embedded successfully!")
        st.dataframe(pd.DataFrame(results))

        # ---------------- GENERATE COs ----------------
        st.subheader("⚙️ Generate Course Outcomes (COs)")

        # Max COs can't exceed number of text chunks
        max_cos = len(texts)
        if max_cos < 1:
            st.warning("Upload at least one document to generate COs.")
        else:
            num_cos = st.slider(
                "Number of COs to generate",
                min_value=1,
                max_value=max_cos,
                value=min(5, max_cos)
            )

            cos = generate_cos(texts, num_cos)

            st.subheader("Generated Course Outcomes (COs)")
            for co, text in cos.items():
                st.markdown(f"**{co}:** {text}")

# ---------------------------- SEARCH PAGE ----------------------------
elif page == "Search CO/PO":
    st.subheader("🔍 Search for CO/PO-Related Content")
    query = st.text_input("Enter your CO/PO topic or keyword:")
    if query:
        results = search_in_db(query)
        if len(results["ids"][0]) > 0:
            st.write(f"**Top Matches for '{query}'**")
            for i, doc_id in enumerate(results["ids"][0]):
                st.markdown(f"**📄 Document:** {doc_id}")
                st.markdown(f"**🧠 Similarity Score:** {results['distances'][0][i]:.3f}")
                st.markdown(f"**📜 Excerpt:** {results['documents'][0][i][:500]}...")
                st.markdown("---")
        else:
            st.warning("No relevant content found.")
