from sqlalchemy.orm import Session
from models.error_log import ErrorLog
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging
import traceback
from fastapi import Request

logger = logging.getLogger("error_log_service")

class ErrorLogService:
    """
    Service for managing error logs in the database
    """
    
    @staticmethod
    def create_error_log(
        db: Session,
        error_type: str,
        message: str,
        severity: str,
        code: Optional[str] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        user_id: Optional[int] = None,
        request: Optional[Request] = None
    ) -> ErrorLog:
        """
        Create a new error log entry in the database
        """
        try:
            # Extract additional information from request if available
            ip_address = None
            user_agent = None
            
            if request:
                ip_address = request.client.host if hasattr(request.client, 'host') else None
                user_agent = request.headers.get("user-agent")
            
            # Create error log
            error_log = ErrorLog(
                error_type=error_type,
                message=message,
                severity=severity,
                code=code,
                request_id=request_id,
                path=path,
                details=details,
                stack_trace=stack_trace,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Add to database
            db.add(error_log)
            db.commit()
            db.refresh(error_log)
            
            return error_log
            
        except Exception as e:
            # Log the error but don't raise to avoid circular error handling
            logger.error(f"Failed to create error log: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Try to rollback the transaction
            try:
                db.rollback()
            except:
                pass
            
            return None
    
    @staticmethod
    def get_error_logs(
        db: Session,
        error_type: Optional[str] = None,
        severity: Optional[str] = None,
        code: Optional[str] = None,
        path: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[ErrorLog]:
        """
        Get error logs with filtering options
        """
        try:
            # Build query
            query = db.query(ErrorLog)
            
            # Apply filters
            if error_type:
                query = query.filter(ErrorLog.error_type == error_type)
            
            if severity:
                query = query.filter(ErrorLog.severity == severity)
            
            if code:
                query = query.filter(ErrorLog.code == code)
            
            if path:
                query = query.filter(ErrorLog.path.contains(path))
            
            if start_date:
                query = query.filter(ErrorLog.timestamp >= start_date)
            
            if end_date:
                query = query.filter(ErrorLog.timestamp <= end_date)
            
            if user_id:
                query = query.filter(ErrorLog.user_id == user_id)
            
            # Order by timestamp descending
            query = query.order_by(ErrorLog.timestamp.desc())
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            
            # Execute query
            return query.all()
            
        except Exception as e:
            logger.error(f"Failed to get error logs: {str(e)}")
            logger.error(traceback.format_exc())
            return []
    
    @staticmethod
    def get_error_summary(
        db: Session,
        days: int = 7,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get a summary of errors for the specified number of days
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Build base query
            query = db.query(ErrorLog).filter(
                ErrorLog.timestamp >= start_date,
                ErrorLog.timestamp <= end_date
            )
            
            # Filter by user if specified
            if user_id:
                query = query.filter(ErrorLog.user_id == user_id)
            
            # Execute query
            error_logs = query.all()
            
            # Calculate summary statistics
            total_errors = len(error_logs)
            
            # Count errors by type
            errors_by_type = {}
            for log in error_logs:
                if log.error_type not in errors_by_type:
                    errors_by_type[log.error_type] = 0
                errors_by_type[log.error_type] += 1
            
            # Count errors by severity
            errors_by_severity = {}
            for log in error_logs:
                if log.severity not in errors_by_severity:
                    errors_by_severity[log.severity] = 0
                errors_by_severity[log.severity] += 1
            
            # Count errors by day
            errors_by_day = {}
            for log in error_logs:
                day = log.timestamp.strftime("%Y-%m-%d")
                if day not in errors_by_day:
                    errors_by_day[day] = 0
                errors_by_day[day] += 1
            
            # Get most common errors
            error_counts = {}
            for log in error_logs:
                key = f"{log.error_type}:{log.code or 'unknown'}"
                if key not in error_counts:
                    error_counts[key] = {
                        "error_type": log.error_type,
                        "code": log.code,
                        "count": 0,
                        "example_message": log.message
                    }
                error_counts[key]["count"] += 1
            
            # Sort by count and get top 10
            most_common_errors = sorted(
                error_counts.values(),
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            return {
                "total_errors": total_errors,
                "errors_by_type": errors_by_type,
                "errors_by_severity": errors_by_severity,
                "errors_by_day": errors_by_day,
                "most_common_errors": most_common_errors
            }
            
        except Exception as e:
            logger.error(f"Failed to get error summary: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                "total_errors": 0,
                "errors_by_type": {},
                "errors_by_severity": {},
                "errors_by_day": {},
                "most_common_errors": []
            }
    
    @staticmethod
    def delete_error_log(db: Session, error_id: int) -> bool:
        """
        Delete an error log by ID
        """
        try:
            # Find the error log
            error_log = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
            
            if not error_log:
                return False
            
            # Delete the error log
            db.delete(error_log)
            db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete error log: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Try to rollback the transaction
            try:
                db.rollback()
            except:
                pass
            
            return False
    
    @staticmethod
    def clear_error_logs(
        db: Session,
        days: Optional[int] = None,
        error_type: Optional[str] = None,
        severity: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> int:
        """
        Clear error logs with filtering options
        Returns the number of deleted records
        """
        try:
            # Build query
            query = db.query(ErrorLog)
            
            # Apply filters
            if days:
                start_date = datetime.utcnow() - timedelta(days=days)
                query = query.filter(ErrorLog.timestamp >= start_date)
            
            if error_type:
                query = query.filter(ErrorLog.error_type == error_type)
            
            if severity:
                query = query.filter(ErrorLog.severity == severity)
            
            if user_id:
                query = query.filter(ErrorLog.user_id == user_id)
            
            # Count matching records
            count = query.count()
            
            # Delete matching records
            query.delete(synchronize_session=False)
            db.commit()
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to clear error logs: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Try to rollback the transaction
            try:
                db.rollback()
            except:
                pass
            
            return 0

# Create singleton instance
error_log_service = ErrorLogService()

# Export service
__all__ = ["error_log_service"]
