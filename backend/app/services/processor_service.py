from typing import List, Dict, Any

class ProcessorService:
    
    def process_erddap_data(self, erddap_response: Dict[str, Any], limit: int = 50) -> List[Dict[str, Any]]:
        """
        Converts raw ERDDAP JSON into clean usable JSON.
        Removes noise and limits dataset size.
        """
        if not erddap_response or "table" not in erddap_response:
            return []
            
        table = erddap_response["table"]
        column_names = table.get("columnNames", [])
        rows = table.get("rows", [])
        
        # Identify indices for key fields if names vary slightly, 
        # or just assume the order if we request specific columns.
        # It's safer to map by name.
        
        processed_data = []
        
        # Mapping ERDDAP names to cleaner keys if needed
        # We requested: platform_number,time,latitude,longitude,pres,temp,psal
        # ERDDAP names might be specific. We'll use the column names from response to be robust 
        # but can rename them for frontend if needed.
        # For now, let's keep original names or simplify.
        
        for row in rows[:limit]:
            item = dict(zip(column_names, row))
            
            # Basic cleaning or type conversion if necessary
            # For example, ensuring numbers are floats not strings if ERDDAP returns strings
            # But JSON response usually has correct types.
            
            # Remove any rows with missing critical data (optional)
            if item.get("latitude") is None or item.get("longitude") is None:
                continue
                
            processed_data.append(item)
            
        return processed_data

processor = ProcessorService()
