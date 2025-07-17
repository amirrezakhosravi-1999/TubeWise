import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Card, Row, Col, Button, ProgressBar, Alert, Modal } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaCrown, FaInfoCircle, FaArrowRight } from 'react-icons/fa';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/Subscription.css';

interface SubscriptionDetails {
  plan: string;
  status: string;
  start_date?: string;
  end_date?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  limits: {
    videos_summarized: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
    videos_compared: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
    content_generated: {
      limit: number;
      used: number;
      remaining: number;
      allowed: boolean;
    };
  };
}

const Subscription: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelSuccess, setCancelSuccess] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=subscription');
      return;
    }

    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/subscription/subscription');
        setSubscription(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError(t('subscription.error_loading'));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [t, isAuthenticated, navigate]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/subscription/create-checkout-session');
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(t('subscription.error_checkout'));
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      await axios.post('/api/subscription/cancel');
      setCancelSuccess(true);
      setCancelError(null);
      
      // Refresh subscription data
      const response = await axios.get('/api/subscription/subscription');
      setSubscription(response.data);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setCancelError(t('subscription.error_cancel'));
      setCancelSuccess(false);
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading && !subscription) {
    return (
      <>
        <Header />
        <Container className="subscription-container text-center py-5">
          <h1>{t('subscription.loading')}</h1>
        </Container>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Container className="subscription-container text-center py-5">
          <Alert variant="danger">{error}</Alert>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="subscription-container py-5">
        <h1 className="text-center mb-5">{t('subscription.title')}</h1>
        
        {subscription && (
          <>
            <Card className="subscription-card mb-5">
              <Card.Header>
                <h3 className="d-flex align-items-center">
                  {subscription.plan === 'pro' ? (
                    <>
                      <FaCrown className="text-warning me-2" />
                      {t('subscription.pro_plan')}
                    </>
                  ) : (
                    <>
                      {t('subscription.free_plan')}
                    </>
                  )}
                </h3>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h4>{t('subscription.plan_details')}</h4>
                    <ul className="plan-details">
                      <li>
                        <strong>{t('subscription.status')}:</strong> 
                        <span className={`status-badge ${subscription.status}`}>
                          {t(`subscription.status_${subscription.status}`)}
                        </span>
                      </li>
                      {subscription.plan === 'pro' && (
                        <>
                          {subscription.start_date && (
                            <li>
                              <strong>{t('subscription.start_date')}:</strong> 
                              {formatDate(subscription.start_date)}
                            </li>
                          )}
                          {subscription.current_period_end && (
                            <li>
                              <strong>{t('subscription.renewal_date')}:</strong> 
                              {formatDate(subscription.current_period_end)}
                            </li>
                          )}
                          {subscription.cancel_at_period_end && (
                            <li className="text-danger">
                              <strong>{t('subscription.cancellation')}:</strong> 
                              {t('subscription.cancels_on')} {formatDate(subscription.current_period_end)}
                            </li>
                          )}
                        </>
                      )}
                    </ul>

                    {subscription.plan === 'free' ? (
                      <Button 
                        variant="primary" 
                        size="lg" 
                        className="mt-3"
                        onClick={handleUpgrade}
                      >
                        {t('subscription.upgrade_to_pro')} <FaArrowRight className="ms-2" />
                      </Button>
                    ) : (
                      <>
                        {!subscription.cancel_at_period_end && (
                          <Button 
                            variant="outline-danger" 
                            className="mt-3"
                            onClick={() => setShowCancelModal(true)}
                          >
                            {t('subscription.cancel_subscription')}
                          </Button>
                        )}
                      </>
                    )}
                  </Col>
                  <Col md={6}>
                    <h4>{t('subscription.usage_limits')}</h4>
                    <div className="usage-limits">
                      <div className="usage-item">
                        <div className="d-flex justify-content-between">
                          <span>{t('subscription.videos_summarized')}</span>
                          <span>
                            {subscription.limits.videos_summarized.used} / {subscription.limits.videos_summarized.limit}
                          </span>
                        </div>
                        <ProgressBar 
                          now={(subscription.limits.videos_summarized.used / subscription.limits.videos_summarized.limit) * 100} 
                          variant={subscription.limits.videos_summarized.remaining > 2 ? "success" : "warning"}
                        />
                      </div>

                      <div className="usage-item">
                        <div className="d-flex justify-content-between">
                          <span>{t('subscription.videos_compared')}</span>
                          <span>
                            {subscription.limits.videos_compared.used} / {subscription.limits.videos_compared.limit}
                          </span>
                        </div>
                        <ProgressBar 
                          now={(subscription.limits.videos_compared.used / subscription.limits.videos_compared.limit) * 100} 
                          variant={subscription.limits.videos_compared.allowed ? "success" : "danger"}
                        />
                        {!subscription.limits.videos_compared.allowed && (
                          <div className="text-danger small mt-1">
                            <FaInfoCircle className="me-1" />
                            {t('subscription.pro_only_feature')}
                          </div>
                        )}
                      </div>

                      <div className="usage-item">
                        <div className="d-flex justify-content-between">
                          <span>{t('subscription.content_generated')}</span>
                          <span>
                            {subscription.limits.content_generated.used} / {subscription.limits.content_generated.limit}
                          </span>
                        </div>
                        <ProgressBar 
                          now={(subscription.limits.content_generated.used / subscription.limits.content_generated.limit) * 100} 
                          variant={subscription.limits.content_generated.remaining > 2 ? "success" : "warning"}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <div className="subscription-info">
              <h3>{t('subscription.plan_comparison')}</h3>
              <Row className="mt-4">
                <Col md={6}>
                  <Card className="feature-card">
                    <Card.Header>
                      <h4>{t('subscription.free_plan')}</h4>
                    </Card.Header>
                    <Card.Body>
                      <ul className="feature-list">
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_summaries', { count: 5 })}
                        </li>
                        <li>
                          <FaTimesCircle className="text-danger me-2" />
                          {t('subscription.feature_comparisons')}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_content', { count: 10 })}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_basic_ai')}
                        </li>
                      </ul>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className={`feature-card ${subscription.plan === 'pro' ? 'current-plan' : ''}`}>
                    <Card.Header>
                      <h4>
                        <FaCrown className="text-warning me-2" />
                        {t('subscription.pro_plan')}
                      </h4>
                    </Card.Header>
                    <Card.Body>
                      <ul className="feature-list">
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_summaries', { count: 100 })}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_comparisons_pro', { count: 20 })}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_content', { count: 50 })}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_advanced_ai')}
                        </li>
                        <li>
                          <FaCheckCircle className="text-success me-2" />
                          {t('subscription.feature_priority')}
                        </li>
                      </ul>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </>
        )}

        {/* Cancel Subscription Modal */}
        <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('subscription.cancel_title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {!cancelSuccess ? (
              <>
                <p>{t('subscription.cancel_confirmation')}</p>
                <ul>
                  <li>{t('subscription.cancel_info_1')}</li>
                  <li>{t('subscription.cancel_info_2')}</li>
                  <li>{t('subscription.cancel_info_3')}</li>
                </ul>
                {cancelError && <Alert variant="danger">{cancelError}</Alert>}
              </>
            ) : (
              <Alert variant="success">
                <h5>{t('subscription.cancel_success_title')}</h5>
                <p>{t('subscription.cancel_success_message')}</p>
                <p>{t('subscription.cancel_end_date', { date: formatDate(subscription?.current_period_end) })}</p>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            {!cancelSuccess ? (
              <>
                <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                  {t('subscription.cancel_no')}
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? t('subscription.processing') : t('subscription.cancel_yes')}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setShowCancelModal(false)}>
                {t('subscription.close')}
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
      <Footer />
    </>
  );
};

export default Subscription;
