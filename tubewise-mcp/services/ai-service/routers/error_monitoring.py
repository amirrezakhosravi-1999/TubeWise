from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from db import get_db
from error_handler import error_handler, ErrorType, ErrorSeverity
from services.error_log_service import error_log_service
from models.error_log import ErrorLog
from pydantic import BaseModel
import logging

# Configure logging
logger = logging.getLogger("error_monitoring")

# Create router
router = APIRouter()

# Models
class ErrorLogEntry(BaseModel):
    id: int
    error_type: str
    message: str
    severity: str
    code: Optional[str] = None
    request_id: Optional[str] = None
    path: Optional[str] = None
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True

class ErrorLogFilter(BaseModel):
    error_type: Optional[str] = None
    severity: Optional[str] = None
    code: Optional[str] = None
    path: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0

class ErrorSummary(BaseModel):
    total_errors: int
    errors_by_type: Dict[str, int]
    errors_by_severity: Dict[str, int]
    errors_by_day: Dict[str, int]
    most_common_errors: List[Dict[str, Any]]

# Routes
@router.get("/errors", response_model=List[ErrorLogEntry], tags=["Error Monitoring"])
async def get_error_logs(
    request: Request,
    filter: ErrorLogFilter = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get error logs with filtering options
    """
    # Check if user has admin role
    # This would typically use your authentication system
    # For example: user = get_current_user(request)
    # if user.role != "admin":
    #    raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Use the error log service to get error logs
        error_logs = error_log_service.get_error_logs(
            db=db,
            error_type=filter.error_type,
            severity=filter.severity,
            code=filter.code,
            path=filter.path,
            start_date=filter.start_date,
            end_date=filter.end_date,
            limit=filter.limit,
            offset=filter.offset
        )
        
        # Convert to response model
        result = []
        for log in error_logs:
            result.append(ErrorLogEntry(
                id=log.id,
                error_type=log.error_type,
                message=log.message,
                severity=log.severity,
                code=log.code,
                request_id=log.request_id,
                path=log.path,
                timestamp=log.timestamp,
                details=log.details
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving error logs: {str(e)}")
        return error_handler.internal_error(
            message="Failed to retrieve error logs",
            details={"error": str(e)},
            request_id=getattr(request.state, "request_id", None),
            path=request.url.path
        )

@router.get("/errors/summary", response_model=ErrorSummary, tags=["Error Monitoring"])
async def get_error_summary(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """
    Get a summary of errors for the specified number of days
    """
    # Check if user has admin role
    # This would typically use your authentication system
    
    try:
        # Use the error log service to get error summary
        summary = error_log_service.get_error_summary(db=db, days=days)
        
        return summary
        
    except Exception as e:
        logger.error(f"Error generating error summary: {str(e)}")
        return error_handler.internal_error(
            message="Failed to generate error summary",
            details={"error": str(e)},
            request_id=getattr(request.state, "request_id", None),
            path=request.url.path
        )

@router.delete("/errors/{error_id}", tags=["Error Monitoring"])
async def delete_error_log(
    error_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete an error log entry
    """
    # Check if user has admin role
    # This would typically use your authentication system
    
    try:
        # Use the error log service to delete the error log
        success = error_log_service.delete_error_log(db=db, error_id=error_id)
        
        if not success:
            return error_handler.not_found_error(
                message=f"Error log with ID {error_id} not found",
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )
        
        return {"status": "success", "message": f"Error log {error_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting error log: {str(e)}")
        return error_handler.internal_error(
            message="Failed to delete error log",
            details={"error": str(e)},
            request_id=getattr(request.state, "request_id", None),
            path=request.url.path
        )

@router.delete("/errors", tags=["Error Monitoring"])
async def clear_error_logs(
    request: Request,
    days: Optional[int] = None,
    error_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Clear error logs with filtering options
    """
    # Check if user has admin role
    # This would typically use your authentication system
    
    try:
        # Use the error log service to clear error logs
        count = error_log_service.clear_error_logs(
            db=db,
            days=days,
            error_type=error_type,
            severity=severity
        )
        
        return {
            "status": "success",
            "message": f"Cleared {count} error log entries"
        }
        
    except Exception as e:
        logger.error(f"Error clearing error logs: {str(e)}")
        return error_handler.internal_error(
            message="Failed to clear error logs",
            details={"error": str(e)},
            request_id=getattr(request.state, "request_id", None),
            path=request.url.path
        )

# Export router
__all__ = ["router"]
