"""
Email router for sending transactional emails
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from auth import get_current_user, get_current_admin_user
from email_service import email_service

router = APIRouter(
    prefix="/email",
    tags=["email"],
    responses={404: {"description": "Not found"}},
)

class SendEmailRequest(BaseModel):
    """Request model for sending an email"""
    to: EmailStr
    subject: str
    html_content: str
    text_content: str
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    tags: Optional[List[str]] = None

class SendTemplateEmailRequest(BaseModel):
    """Request model for sending a template email"""
    template_name: str
    to: EmailStr
    data: Dict[str, Any]
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    tags: Optional[List[str]] = None

class EmailResponse(BaseModel):
    """Response model for email operations"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/send", response_model=EmailResponse)
async def send_email(
    request: SendEmailRequest,
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Send an email (admin only)
    """
    try:
        response = email_service.send_email(
            to=request.to,
            subject=request.subject,
            html_content=request.html_content,
            text_content=request.text_content,
            cc=request.cc,
            bcc=request.bcc,
            tags=request.tags
        )
        
        if "error" in response:
            return EmailResponse(
                success=False,
                message=f"Failed to send email: {response['error']}",
                data=response
            )
        
        return EmailResponse(
            success=True,
            message="Email sent successfully",
            data=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )

@router.post("/send-template", response_model=EmailResponse)
async def send_template_email(
    request: SendTemplateEmailRequest,
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Send a template email (admin only)
    """
    try:
        response = email_service.send_template_email(
            template_name=request.template_name,
            to=request.to,
            data=request.data,
            cc=request.cc,
            bcc=request.bcc,
            tags=request.tags
        )
        
        if "error" in response:
            return EmailResponse(
                success=False,
                message=f"Failed to send email: {response['error']}",
                data=response
            )
        
        return EmailResponse(
            success=True,
            message="Email sent successfully",
            data=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )

@router.post("/welcome", response_model=EmailResponse)
async def send_welcome_email(
    to: EmailStr,
    name: str,
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Send a welcome email (admin only)
    """
    try:
        response = email_service.send_welcome_email(
            to=to,
            name=name
        )
        
        if "error" in response:
            return EmailResponse(
                success=False,
                message=f"Failed to send welcome email: {response['error']}",
                data=response
            )
        
        return EmailResponse(
            success=True,
            message="Welcome email sent successfully",
            data=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send welcome email: {str(e)}"
        )

@router.post("/password-reset", response_model=EmailResponse)
async def send_password_reset_email(
    to: EmailStr,
    name: str,
    reset_link: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Send a password reset email (user can request for themselves)
    """
    # Check if the user is requesting for themselves or is an admin
    if current_user["email"] != to and current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="You can only request password reset for your own account"
        )
    
    try:
        response = email_service.send_password_reset_email(
            to=to,
            name=name,
            reset_link=reset_link
        )
        
        if "error" in response:
            return EmailResponse(
                success=False,
                message=f"Failed to send password reset email: {response['error']}",
                data=response
            )
        
        return EmailResponse(
            success=True,
            message="Password reset email sent successfully",
            data=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send password reset email: {str(e)}"
        )

@router.post("/credits-low", response_model=EmailResponse)
async def send_credits_low_email(
    to: EmailStr,
    name: str,
    email: EmailStr,
    credits_left: int,
    feature_name: str,
    current_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Send a credits low email (admin only)
    """
    try:
        response = email_service.send_credits_low_email(
            to=to,
            name=name,
            email=email,
            credits_left=credits_left,
            feature_name=feature_name
        )
        
        if "error" in response:
            return EmailResponse(
                success=False,
                message=f"Failed to send credits low email: {response['error']}",
                data=response
            )
        
        return EmailResponse(
            success=True,
            message="Credits low email sent successfully",
            data=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send credits low email: {str(e)}"
        )
