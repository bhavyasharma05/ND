from datetime import datetime
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class TrendService:
    def generate_trends(self, data: list) -> list:
        """
        Aggregates raw oceanographic data by date to compute daily averages.
        
        Args:
            data (list): List of dicts containing 'time', 'temp', 'psal', etc.
            
        Returns:
            list: List of dicts with 'date', 'avg_temp', 'avg_salinity', 'count'.
                  Sorted by date ascending.
        """
        if not data:
            return []

        daily_groups = defaultdict(list)

        for entry in data:
            try:
                # Parse timestamp "2024-01-01T12:00:00Z" -> "2024-01-01"
                # Assuming 'time' is ISO format string
                ts = entry.get('time')
                if not ts:
                    continue
                
                # Handle potential Z at end or ISO format variations
                date_str = ts.split('T')[0]
                
                daily_groups[date_str].append(entry)
            except Exception as e:
                logger.warning(f"Error processing entry for trend: {entry}, error: {e}")
                continue

        results = []
        for date_str, entries in daily_groups.items():
            # Filter and convert to float, ignoring invalid physical values
            # Salinity ~35 PSU, 0 is invalid/sensor error
            # Pressure must be positive
            
            temps = []
            for e in entries:
                try:
                    val = float(e.get('temp'))
                    if val is not None and -5 < val < 40: # Reasonable ocean temp range
                        temps.append(val)
                except (ValueError, TypeError):
                    pass

            salinities = []
            for e in entries:
                try:
                    val = float(e.get('psal'))
                    if val is not None and 10 < val < 45: # Reasonable salinity range
                        salinities.append(val)
                except (ValueError, TypeError):
                    pass

            pressures = []
            for e in entries:
                try:
                    val = float(e.get('pres'))
                    if val is not None and val >= 0:
                        pressures.append(val)
                except (ValueError, TypeError):
                    pass

            avg_temp = round(sum(temps) / len(temps), 2) if temps else None
            avg_sal = round(sum(salinities) / len(salinities), 2) if salinities else None
            avg_pres = round(sum(pressures) / len(pressures), 2) if pressures else None

            results.append({
                "date": date_str,
                "avg_temp": avg_temp,
                "avg_salinity": avg_sal,
                "avg_pressure": avg_pres,
                "reading_count": len(entries)
            })

        # Sort by date
        results.sort(key=lambda x: x['date'])
        
        return results

trend_service = TrendService()
