from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ErrorLog(Base):
    """
    Model for storing error logs in the database
    """
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    error_type = Column(String(50), nullable=False, index=True)
    message = Column(String(500), nullable=False)
    severity = Column(String(20), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    request_id = Column(String(50), nullable=True, index=True)
    path = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    details = Column(JSON, nullable=True)
    stack_trace = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=True, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, error_type='{self.error_type}', severity='{self.severity}', timestamp='{self.timestamp}')>"
    
    def to_dict(self):
        """
        Convert the model instance to a dictionary
        """
        return {
            "id": self.id,
            "error_type": self.error_type,
            "message": self.message,
            "severity": self.severity,
            "code": self.code,
            "request_id": self.request_id,
            "path": self.path,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "details": self.details,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent
        }
