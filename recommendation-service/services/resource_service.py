"""
Resource Management Service
"""

import pandas as pd
import logging
from typing import List, Optional, Dict, Any
from core.config import settings
from fastapi import UploadFile
import os

logger = logging.getLogger(__name__)


class ResourceService:
    """Service for managing learning resources"""
    
    def _load_resources(self) -> pd.DataFrame:
        """Load resources from CSV"""
        if not os.path.exists(settings.RESOURCES_FILE):
            return pd.DataFrame(columns=[
                "resource_id", "title", "url", "CO", "topic",
                "estimated_time_min", "difficulty", "description", "type"
            ])
        return pd.read_csv(settings.RESOURCES_FILE)
    
    def _save_resources(self, df: pd.DataFrame):
        """Save resources to CSV"""
        os.makedirs(settings.DATA_DIR, exist_ok=True)
        df.to_csv(settings.RESOURCES_FILE, index=False)
    
    async def get_resources(
        self,
        co: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get resources with optional filtering"""
        try:
            df = self._load_resources()
            
            # Apply filters
            if co:
                df = df[df["CO"].str.upper() == co.upper()]
            if topic:
                df = df[df["topic"].str.contains(topic, case=False, na=False)]
            if difficulty:
                df = df[df["difficulty"].str.lower() == difficulty.lower()]
            if resource_type:
                df = df[df["type"].str.lower() == resource_type.lower()]
            
            # Limit results
            df = df.head(limit)
            
            return df.to_dict("records")
            
        except Exception as e:
            logger.error(f"Error getting resources: {str(e)}", exc_info=True)
            return []
    
    async def get_resource_by_id(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific resource by ID"""
        try:
            df = self._load_resources()
            resource = df[df["resource_id"] == resource_id]
            
            if resource.empty:
                return None
            
            return resource.iloc[0].to_dict()
            
        except Exception as e:
            logger.error(f"Error getting resource: {str(e)}", exc_info=True)
            return None
    
    async def create_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new resource"""
        try:
            df = self._load_resources()
            
            # Add new resource
            new_row = pd.DataFrame([resource])
            df = pd.concat([df, new_row], ignore_index=True)
            
            self._save_resources(df)
            
            return resource
            
        except Exception as e:
            logger.error(f"Error creating resource: {str(e)}", exc_info=True)
            raise
    
    async def update_resource(
        self,
        resource_id: str,
        resource: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an existing resource"""
        try:
            df = self._load_resources()
            
            # Find and update
            idx = df[df["resource_id"] == resource_id].index
            
            if len(idx) == 0:
                return None
            
            for key, value in resource.items():
                df.loc[idx[0], key] = value
            
            self._save_resources(df)
            
            return df.loc[idx[0]].to_dict()
            
        except Exception as e:
            logger.error(f"Error updating resource: {str(e)}", exc_info=True)
            raise
    
    async def delete_resource(self, resource_id: str) -> bool:
        """Delete a resource"""
        try:
            df = self._load_resources()
            
            # Remove resource
            initial_len = len(df)
            df = df[df["resource_id"] != resource_id]
            
            if len(df) == initial_len:
                return False
            
            self._save_resources(df)
            return True
            
        except Exception as e:
            logger.error(f"Error deleting resource: {str(e)}", exc_info=True)
            return False
    
    async def upload_resources_csv(self, file: UploadFile) -> Dict[str, Any]:
        """Upload resources via CSV"""
        try:
            # Read uploaded CSV
            contents = await file.read()
            from io import StringIO
            new_df = pd.read_csv(StringIO(contents.decode('utf-8')))
            
            # Load existing
            existing_df = self._load_resources()
            
            # Merge (update existing, add new)
            created = 0
            updated = 0
            
            for _, row in new_df.iterrows():
                rid = row["resource_id"]
                if rid in existing_df["resource_id"].values:
                    # Update
                    idx = existing_df[existing_df["resource_id"] == rid].index[0]
                    for col in new_df.columns:
                        existing_df.loc[idx, col] = row[col]
                    updated += 1
                else:
                    # Create
                    existing_df = pd.concat([existing_df, row.to_frame().T], ignore_index=True)
                    created += 1
            
            self._save_resources(existing_df)
            
            return {"created": created, "updated": updated}
            
        except Exception as e:
            logger.error(f"Error uploading CSV: {str(e)}", exc_info=True)
            raise
    
    async def get_topics_by_co(self, co: str) -> List[str]:
        """Get all topics for a specific CO"""
        try:
            df = self._load_resources()
            co_resources = df[df["CO"].str.upper() == co.upper()]
            topics = co_resources["topic"].unique().tolist()
            return [t for t in topics if t and str(t).strip()]
            
        except Exception as e:
            logger.error(f"Error getting topics: {str(e)}", exc_info=True)
            return []
    
    async def get_resources_summary(self) -> Dict[str, Any]:
        """Get summary statistics of all resources"""
        try:
            df = self._load_resources()
            
            return {
                "total_resources": len(df),
                "by_co": df["CO"].value_counts().to_dict(),
                "by_difficulty": df["difficulty"].value_counts().to_dict(),
                "by_type": df["type"].value_counts().to_dict(),
                "total_study_time_hours": round(df["estimated_time_min"].sum() / 60, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting summary: {str(e)}", exc_info=True)
            return {}



