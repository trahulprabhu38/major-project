"""
Integration script to add advanced pipeline as optional demo mode
This doesn't disrupt existing flow - just adds a demo button
"""
import streamlit as st
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from advanced_co_pipeline import AdvancedCOPipeline

def show_advanced_pipeline_demo():
    """Show advanced pipeline demo in Streamlit"""
    st.markdown("---")
    st.markdown("### 🚀 Advanced Pipeline Demo (For Professors)")
    
    with st.expander("🏗️ Architecture Overview", expanded=False):
        st.markdown("""
        **Multi-Stage AI Pipeline:**
        
        1. **Document Intelligence Layer**
           - Multi-format extraction (PDF, PPT, DOCX)
           - Semantic chunking with embeddings
           - Metadata extraction
        
        2. **Knowledge Graph (Neo4j)**
           - Structured syllabus representation
           - Nodes: Modules, Topics, Bloom Verbs, POs
           - Edges: Prerequisites, Hierarchies
        
        3. **Graph-RAG Retrieval**
           - Vector search (ChromaDB) + Graph traversal
           - Hybrid ranking for context retrieval
        
        4. **Multi-Task Fine-Tuned LLM (QLoRA)**
           - CO generation + Bloom classification + PO mapping
           - Single forward pass
        
        5. **Refinement Layer (RLHF)**
           - VTU-style validation
           - OBE alignment
           - Explainable justifications
        """)
    
    if st.button("🎯 Run Advanced Pipeline Demo", type="secondary"):
        with st.spinner("🚀 Executing advanced multi-stage pipeline..."):
            try:
                pipeline = AdvancedCOPipeline(
                    base_model="Qwen/Qwen2.5-0.5B-Instruct",
                    lora_path="qwen_co_lora"
                )
                
                result = pipeline.generate_complete(num_apply=2, num_analyze=2)
                
                st.success("✅ Advanced pipeline execution complete!")
                
                # Show results
                st.markdown("### 📋 Generated COs (Advanced Pipeline)")
                st.code(result['co_output'], language=None)
                
                # Show statistics
                st.markdown("### 📊 Pipeline Statistics")
                stats = result['pipeline_stats']
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Documents", stats['documents_processed'])
                with col2:
                    st.metric("Graph Nodes", stats['graph_nodes'])
                with col3:
                    st.metric("Avg Score", f"{stats['average_score']:.2f}")
                with col4:
                    st.metric("Approved", f"{stats['approved_count']}/6")
                
                # Show justifications
                with st.expander("🔍 Explainability: Source Tracking & Justifications"):
                    for i, co in enumerate(result['cos'], 1):
                        st.markdown(f"**CO{i}:**")
                        st.json(co['justification'])
                
                # Export option
                if st.button("💾 Export Complete Report"):
                    pipeline.export_report(result)
                    st.success("Report exported to data/pipeline_report.json")
                    
            except Exception as e:
                st.error(f"❌ Pipeline error: {str(e)}")
                st.exception(e)

