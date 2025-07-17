from enum import Enum
from typing import Dict, Any, Optional, List, Union
import logging
import traceback
import json
import time
from datetime import datetime
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app_errors.log")
    ]
)

logger = logging.getLogger("error_handler")

# Error types
class ErrorType(str, Enum):
    VALIDATION = "validation_error"
    AUTHENTICATION = "authentication_error"
    AUTHORIZATION = "authorization_error"
    RESOURCE_NOT_FOUND = "resource_not_found"
    RATE_LIMIT = "rate_limit_error"
    DEPENDENCY = "dependency_error"
    INTERNAL = "internal_error"
    EXTERNAL_SERVICE = "external_service_error"
    UNEXPECTED = "unexpected_error"
    BUSINESS_LOGIC = "business_logic_error"

# Error severity levels
class ErrorSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# Standard error response
class ErrorResponse:
    def __init__(
        self,
        error_type: ErrorType,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        path: Optional[str] = None,
    ):
        self.error_type = error_type
        self.message = message
        self.severity = severity
        self.code = code
        self.details = details or {}
        self.request_id = request_id
        self.timestamp = timestamp or datetime.utcnow()
        self.path = path
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": self.error_type,
            "message": self.message,
            "severity": self.severity,
            "code": self.code,
            "details": self.details,
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat(),
            "path": self.path
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())

# Error handler class
class ErrorHandler:
    def __init__(self):
        self.logger = logger
    
    def log_error(self, error: ErrorResponse, exc_info=None):
        """Log error to file and console"""
        log_data = error.to_dict()
        
        # Rename 'message' key to prevent conflict with logging's internal 'message' field
        if 'message' in log_data:
            log_data['error_message'] = log_data.pop('message')
        
        if exc_info:
            log_data["traceback"] = traceback.format_exception(*exc_info)
        
        # Log based on severity
        if error.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(f"CRITICAL ERROR: {error.message}", extra=log_data, exc_info=exc_info)
        elif error.severity == ErrorSeverity.ERROR:
            self.logger.error(f"ERROR: {error.message}", extra=log_data, exc_info=exc_info)
        elif error.severity == ErrorSeverity.WARNING:
            self.logger.warning(f"WARNING: {error.message}", extra=log_data)
        else:
            self.logger.info(f"INFO: {error.message}", extra=log_data)
    
    def create_error_response(
        self,
        error_type: ErrorType,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None,
        status_code: int = 500,
        exc_info=None
    ) -> JSONResponse:
        """Create a standardized error response"""
        error = ErrorResponse(
            error_type=error_type,
            message=message,
            severity=severity,
            code=code,
            details=details,
            request_id=request_id,
            path=path
        )
        
        # Log the error
        self.log_error(error, exc_info)
        
        # Return JSON response
        return JSONResponse(
            status_code=status_code,
            content=error.to_dict()
        )
    
    def validation_error(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None, 
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle validation errors"""
        return self.create_error_response(
            error_type=ErrorType.VALIDATION,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="VALIDATION_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=400
        )
    
    def authentication_error(
        self, 
        message: str = "Authentication required", 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle authentication errors"""
        return self.create_error_response(
            error_type=ErrorType.AUTHENTICATION,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="AUTHENTICATION_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=401
        )
    
    def authorization_error(
        self, 
        message: str = "You do not have permission to perform this action", 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle authorization errors"""
        return self.create_error_response(
            error_type=ErrorType.AUTHORIZATION,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="AUTHORIZATION_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=403
        )
    
    def not_found_error(
        self, 
        message: str = "Resource not found", 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle not found errors"""
        return self.create_error_response(
            error_type=ErrorType.RESOURCE_NOT_FOUND,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="RESOURCE_NOT_FOUND",
            details=details,
            request_id=request_id,
            path=path,
            status_code=404
        )
    
    def rate_limit_error(
        self, 
        message: str = "Rate limit exceeded", 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle rate limit errors"""
        return self.create_error_response(
            error_type=ErrorType.RATE_LIMIT,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="RATE_LIMIT_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=429
        )
    
    def dependency_error(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None,
        exc_info=None
    ) -> JSONResponse:
        """Handle dependency errors (e.g. database, cache)"""
        return self.create_error_response(
            error_type=ErrorType.DEPENDENCY,
            message=message,
            severity=ErrorSeverity.ERROR,
            code="DEPENDENCY_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=500,
            exc_info=exc_info
        )
    
    def external_service_error(
        self, 
        message: str, 
        service_name: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None,
        exc_info=None
    ) -> JSONResponse:
        """Handle external service errors (e.g. YouTube API, LLM API)"""
        if details is None:
            details = {}
        
        details["service_name"] = service_name
        
        return self.create_error_response(
            error_type=ErrorType.EXTERNAL_SERVICE,
            message=message,
            severity=ErrorSeverity.ERROR,
            code=f"EXTERNAL_SERVICE_ERROR_{service_name.upper()}",
            details=details,
            request_id=request_id,
            path=path,
            status_code=502,
            exc_info=exc_info
        )
    
    def internal_error(
        self, 
        message: str = "Internal server error", 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None,
        exc_info=None
    ) -> JSONResponse:
        """Handle internal server errors"""
        return self.create_error_response(
            error_type=ErrorType.INTERNAL,
            message=message,
            severity=ErrorSeverity.ERROR,
            code="INTERNAL_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=500,
            exc_info=exc_info
        )
    
    def unexpected_error(
        self, 
        exception: Exception,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle unexpected errors"""
        return self.create_error_response(
            error_type=ErrorType.UNEXPECTED,
            message="An unexpected error occurred",
            severity=ErrorSeverity.CRITICAL,
            code="UNEXPECTED_ERROR",
            details={"error_class": exception.__class__.__name__},
            request_id=request_id,
            path=path,
            status_code=500,
            exc_info=(type(exception), exception, exception.__traceback__)
        )
    
    def business_logic_error(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """Handle business logic errors"""
        return self.create_error_response(
            error_type=ErrorType.BUSINESS_LOGIC,
            message=message,
            severity=ErrorSeverity.WARNING,
            code="BUSINESS_LOGIC_ERROR",
            details=details,
            request_id=request_id,
            path=path,
            status_code=400
        )

# Create a singleton instance
error_handler = ErrorHandler()

# Middleware for request/response logging and error handling
class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Add request ID to response headers
        start_time = time.time()
        
        try:
            # Process the request and get the response
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add custom headers to the response
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as exc:
            # Handle any unhandled exceptions
            process_time = time.time() - start_time
            
            # Create error response
            error_response = error_handler.unexpected_error(
                exception=exc,
                request_id=request_id,
                path=request.url.path
            )
            
            # Add custom headers to the error response
            error_response.headers["X-Request-ID"] = request_id
            error_response.headers["X-Process-Time"] = str(process_time)
            
            return error_response

# Exception handlers for FastAPI
def configure_exception_handlers(app):
    from fastapi import HTTPException, Request
    from fastapi.exceptions import RequestValidationError
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle FastAPI HTTP exceptions"""
        request_id = getattr(request.state, "request_id", None)
        
        if exc.status_code == 401:
            return error_handler.authentication_error(
                message=exc.detail,
                request_id=request_id,
                path=request.url.path
            )
        elif exc.status_code == 403:
            return error_handler.authorization_error(
                message=exc.detail,
                request_id=request_id,
                path=request.url.path
            )
        elif exc.status_code == 404:
            return error_handler.not_found_error(
                message=exc.detail,
                request_id=request_id,
                path=request.url.path
            )
        elif exc.status_code == 429:
            return error_handler.rate_limit_error(
                message=exc.detail,
                request_id=request_id,
                path=request.url.path
            )
        else:
            return error_handler.create_error_response(
                error_type=ErrorType.INTERNAL,
                message=exc.detail,
                severity=ErrorSeverity.ERROR,
                code=f"HTTP_{exc.status_code}",
                request_id=request_id,
                path=request.url.path,
                status_code=exc.status_code
            )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle FastAPI validation exceptions"""
        request_id = getattr(request.state, "request_id", None)
        
        # Format validation errors
        error_details = []
        for error in exc.errors():
            error_details.append({
                "loc": error["loc"],
                "msg": error["msg"],
                "type": error["type"]
            })
        
        return error_handler.validation_error(
            message="Validation error",
            details={"errors": error_details},
            request_id=request_id,
            path=request.url.path
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """Handle any unhandled exceptions"""
        request_id = getattr(request.state, "request_id", None)
        
        return error_handler.unexpected_error(
            exception=exc,
            request_id=request_id,
            path=request.url.path
        )
