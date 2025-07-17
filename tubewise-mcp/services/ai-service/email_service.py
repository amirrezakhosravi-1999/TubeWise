"""
Email service for sending transactional emails using Resend
"""
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import resend
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EmailTemplate(BaseModel):
    """Email template model"""
    name: str
    subject: str
    html_content: str
    text_content: str

class EmailAttachment(BaseModel):
    """Email attachment model"""
    filename: str
    content: str
    content_type: str

class EmailService:
    """Service for sending transactional emails"""
    
    def __init__(self):
        """Initialize the email service"""
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM", "no-reply@tubewise.app")
        self.from_name = os.getenv("EMAIL_FROM_NAME", "TubeWise")
        
        if not self.api_key:
            print("Warning: RESEND_API_KEY not set. Email service will not work.")
            self.client = None
        else:
            resend.api_key = self.api_key
            self.client = resend
        
        # Initialize email templates
        self._initialize_templates()
    
    def _initialize_templates(self):
        """Initialize email templates"""
        self.templates = {
            "welcome": EmailTemplate(
                name="welcome",
                subject="Welcome to TubeWise!",
                html_content="""
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .logo { max-width: 150px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
                        .button { display: inline-block; background-color: #722be6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://tubewise.app/logo.png" alt="TubeWise Logo" class="logo">
                            <h1>Welcome to TubeWise!</h1>
                        </div>
                        
                        <p>Hello {{name}},</p>
                        
                        <p>Thank you for joining TubeWise! We're excited to have you on board.</p>
                        
                        <p>With TubeWise, you can:</p>
                        <ul>
                            <li>Get AI-powered summaries of YouTube videos with timestamps</li>
                            <li>Compare multiple videos on the same topic</li>
                            <li>Fact-check claims in videos</li>
                            <li>Generate content from video insights</li>
                        </ul>
                        
                        <p>Ready to get started?</p>
                        
                        <p style="text-align: center;">
                            <a href="https://tubewise.app/dashboard" class="button">Go to Dashboard</a>
                        </p>
                        
                        <p>If you have any questions, feel free to reply to this email.</p>
                        
                        <p>Best regards,<br>The TubeWise Team</p>
                        
                        <div class="footer">
                            <p>© 2025 TubeWise. All rights reserved.</p>
                            <p>
                                <a href="https://tubewise.app/privacy">Privacy Policy</a> | 
                                <a href="https://tubewise.app/terms">Terms of Service</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """,
                text_content="""
                Welcome to TubeWise!
                
                Hello {{name}},
                
                Thank you for joining TubeWise! We're excited to have you on board.
                
                With TubeWise, you can:
                - Get AI-powered summaries of YouTube videos with timestamps
                - Compare multiple videos on the same topic
                - Fact-check claims in videos
                - Generate content from video insights
                
                Ready to get started? Visit https://tubewise.app/dashboard
                
                If you have any questions, feel free to reply to this email.
                
                Best regards,
                The TubeWise Team
                
                © 2025 TubeWise. All rights reserved.
                Privacy Policy: https://tubewise.app/privacy
                Terms of Service: https://tubewise.app/terms
                """
            ),
            "password_reset": EmailTemplate(
                name="password_reset",
                subject="Reset Your TubeWise Password",
                html_content="""
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .logo { max-width: 150px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
                        .button { display: inline-block; background-color: #722be6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://tubewise.app/logo.png" alt="TubeWise Logo" class="logo">
                            <h1>Reset Your Password</h1>
                        </div>
                        
                        <p>Hello {{name}},</p>
                        
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        
                        <p style="text-align: center;">
                            <a href="{{reset_link}}" class="button">Reset Password</a>
                        </p>
                        
                        <p>If you didn't request this, you can safely ignore this email.</p>
                        
                        <p>This link will expire in 24 hours.</p>
                        
                        <p>Best regards,<br>The TubeWise Team</p>
                        
                        <div class="footer">
                            <p>© 2025 TubeWise. All rights reserved.</p>
                            <p>
                                <a href="https://tubewise.app/privacy">Privacy Policy</a> | 
                                <a href="https://tubewise.app/terms">Terms of Service</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """,
                text_content="""
                Reset Your TubeWise Password
                
                Hello {{name}},
                
                We received a request to reset your password. Please visit the following link to create a new password:
                
                {{reset_link}}
                
                If you didn't request this, you can safely ignore this email.
                
                This link will expire in 24 hours.
                
                Best regards,
                The TubeWise Team
                
                © 2025 TubeWise. All rights reserved.
                Privacy Policy: https://tubewise.app/privacy
                Terms of Service: https://tubewise.app/terms
                """
            ),
            "credits_low": EmailTemplate(
                name="credits_low",
                subject="Your TubeWise Credits Are Running Low",
                html_content="""
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .logo { max-width: 150px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
                        .button { display: inline-block; background-color: #722be6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://tubewise.app/logo.png" alt="TubeWise Logo" class="logo">
                            <h1>Your Credits Are Running Low</h1>
                        </div>
                        
                        <p>Hello {{name}},</p>
                        
                        <p>You have only <strong>{{credits_left}} {{feature_name}} credits</strong> remaining this month.</p>
                        
                        <p>Upgrade to TubeWise Pro to get:</p>
                        <ul>
                            <li>50 fact-check credits per month</li>
                            <li>Unlimited video summaries</li>
                            <li>Advanced content generation</li>
                            <li>And much more!</li>
                        </ul>
                        
                        <p style="text-align: center;">
                            <a href="https://tubewise.app/upgrade" class="button">Upgrade to Pro</a>
                        </p>
                        
                        <p>If you have any questions, feel free to reply to this email.</p>
                        
                        <p>Best regards,<br>The TubeWise Team</p>
                        
                        <div class="footer">
                            <p>© 2025 TubeWise. All rights reserved.</p>
                            <p>
                                <a href="https://tubewise.app/privacy">Privacy Policy</a> | 
                                <a href="https://tubewise.app/terms">Terms of Service</a> |
                                <a href="https://tubewise.app/unsubscribe?email={{email}}">Unsubscribe</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """,
                text_content="""
                Your TubeWise Credits Are Running Low
                
                Hello {{name}},
                
                You have only {{credits_left}} {{feature_name}} credits remaining this month.
                
                Upgrade to TubeWise Pro to get:
                - 50 fact-check credits per month
                - Unlimited video summaries
                - Advanced content generation
                - And much more!
                
                Upgrade to Pro: https://tubewise.app/upgrade
                
                If you have any questions, feel free to reply to this email.
                
                Best regards,
                The TubeWise Team
                
                © 2025 TubeWise. All rights reserved.
                Privacy Policy: https://tubewise.app/privacy
                Terms of Service: https://tubewise.app/terms
                Unsubscribe: https://tubewise.app/unsubscribe?email={{email}}
                """
            ),
        }
    
    def _replace_placeholders(self, content: str, data: Dict[str, Any]) -> str:
        """Replace placeholders in the template with actual data"""
        for key, value in data.items():
            content = content.replace("{{" + key + "}}", str(value))
        return content
    
    def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send an email
        
        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content of the email
            cc: CC recipients
            bcc: BCC recipients
            attachments: Email attachments
            tags: Email tags
            
        Returns:
            Response from the email service
        """
        if not self.client:
            print("Email service not initialized. Cannot send email.")
            return {"error": "Email service not initialized"}
        
        params = {
            "from": f"{self.from_name} <{self.from_email}>",
            "to": to,
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        
        if cc:
            params["cc"] = cc
        
        if bcc:
            params["bcc"] = bcc
        
        if attachments:
            params["attachments"] = [
                {
                    "filename": attachment.filename,
                    "content": attachment.content,
                    "content_type": attachment.content_type
                }
                for attachment in attachments
            ]
        
        if tags:
            params["tags"] = [{"name": tag} for tag in tags]
        
        try:
            response = self.client.emails.send(**params)
            return response
        except Exception as e:
            print(f"Failed to send email: {e}")
            return {"error": str(e)}
    
    def send_template_email(
        self,
        template_name: str,
        to: str,
        data: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send an email using a template
        
        Args:
            template_name: Name of the template to use
            to: Recipient email address
            data: Data to replace placeholders in the template
            cc: CC recipients
            bcc: BCC recipients
            attachments: Email attachments
            tags: Email tags
            
        Returns:
            Response from the email service
        """
        if template_name not in self.templates:
            print(f"Template {template_name} not found")
            return {"error": f"Template {template_name} not found"}
        
        template = self.templates[template_name]
        
        html_content = self._replace_placeholders(template.html_content, data)
        text_content = self._replace_placeholders(template.text_content, data)
        
        return self.send_email(
            to=to,
            subject=template.subject,
            html_content=html_content,
            text_content=text_content,
            cc=cc,
            bcc=bcc,
            attachments=attachments,
            tags=tags
        )
    
    def send_welcome_email(self, to: str, name: str) -> Dict[str, Any]:
        """
        Send a welcome email
        
        Args:
            to: Recipient email address
            name: Recipient name
            
        Returns:
            Response from the email service
        """
        return self.send_template_email(
            template_name="welcome",
            to=to,
            data={"name": name},
            tags=["welcome"]
        )
    
    def send_password_reset_email(self, to: str, name: str, reset_link: str) -> Dict[str, Any]:
        """
        Send a password reset email
        
        Args:
            to: Recipient email address
            name: Recipient name
            reset_link: Password reset link
            
        Returns:
            Response from the email service
        """
        return self.send_template_email(
            template_name="password_reset",
            to=to,
            data={"name": name, "reset_link": reset_link},
            tags=["password_reset"]
        )
    
    def send_credits_low_email(self, to: str, name: str, email: str, credits_left: int, feature_name: str) -> Dict[str, Any]:
        """
        Send a credits low email
        
        Args:
            to: Recipient email address
            name: Recipient name
            email: Recipient email address (for unsubscribe link)
            credits_left: Number of credits left
            feature_name: Name of the feature
            
        Returns:
            Response from the email service
        """
        return self.send_template_email(
            template_name="credits_low",
            to=to,
            data={
                "name": name,
                "email": email,
                "credits_left": credits_left,
                "feature_name": feature_name
            },
            tags=["credits_low"]
        )

# Create a singleton instance
email_service = EmailService()
