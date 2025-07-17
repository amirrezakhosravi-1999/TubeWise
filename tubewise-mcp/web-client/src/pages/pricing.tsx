import React from 'react';
import { useTranslation } from 'next-i18next';
import { 
  Box, Container, Heading, Text, Button, SimpleGrid,
  useColorModeValue
} from '@chakra-ui/react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';

// Simple structure for pricing plans
const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    features: [
      'Basic summaries',
      'Chrome browser extension',
      'Limited history'
    ],
    limit: '5 videos per month'
  },
  {
    name: 'Pro',
    price: 9.99,
    features: [
      'Advanced summaries',
      'Chrome browser extension',
      'Multi-video comparison',
      'Fact-checking',
      'Content generation',
      'Unlimited history'
    ],
    limit: '100 videos per month'
  },
  {
    name: 'Enterprise',
    price: 49.99,
    features: [
      'All Pro features',
      'Dedicated support',
      'Custom integrations',
      'Team management'
    ],
    limit: '1000 videos per month'
  }
];

const Pricing = () => {
  const { t } = useTranslation('common');
  
  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const headingColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <>
      <Head>
        <title>{t('pricing.title', 'Pricing')} | {t('appName', 'TubeWise')}</title>
        <meta name="description" content={t('pricing.metaDescription', 'TubeWise Pricing Plans')} />
      </Head>

      <Box bg={bgColor} minH="100vh" py={12}>
        <Container maxW="container.xl">
          <Box textAlign="center" mb={16}>
            <Heading as="h1" size="2xl" mb={4} color={headingColor}>
              {t('pricing.title', 'Pricing Plans')} 
            </Heading>
            <Text fontSize="xl" color={textColor} maxW="3xl" mx="auto">
              {t('pricing.subtitle', 'Choose the right plan and enjoy all TubeWise features')}
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
            {pricingPlans.map((plan, index) => (
              <Box 
                key={index} 
                bg={cardBg} 
                p={6} 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor={borderColor}
                boxShadow="md"
                textAlign="center"
              >
                <Heading size="lg" mb={4}>{plan.name}</Heading>
                <Heading size="2xl" mb={6}>
                  ${plan.price}
                  <Text as="span" fontSize="md" fontWeight="normal">{plan.price === 0 ? '' : '/ماه'}</Text>
                </Heading>
                
                <Text fontWeight="bold" mb={4}>{plan.limit}</Text>
                
                {plan.features.map((feature, idx) => (
                  <Text key={idx} mb={2}>{feature}</Text>
                ))}
                
                <Button 
                  mt={8} 
                  colorScheme={index === 1 ? "blue" : "gray"}
                  size="lg"
                  width="full"
                >
                  {plan.price === 0 ? 'Start Free' : 'Subscribe'}
                </Button>
              </Box>
            ))}
          </SimpleGrid>

          <Box mt={20} textAlign="center">
            <Heading as="h2" size="lg" mb={10}>
              {t('pricing.faq.title', 'Frequently Asked Questions')}
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} maxW="container.lg" mx="auto">
              <Box textAlign="left">
                <Heading as="h3" size="md" mb={2}>
                  {t('pricing.faq.q1', 'How do video limits work?')}
                </Heading>
                <Text>{t('pricing.faq.a1', 'On the Free plan, you can summarize up to 5 videos per month. The counter resets at the beginning of each month.')}</Text>
              </Box>
              
              <Box textAlign="left">
                <Heading as="h3" size="md" mb={2}>
                  {t('pricing.faq.q2', 'Can I cancel my subscription anytime?')}
                </Heading>
                <Text>{t('pricing.faq.a2', 'Yes, you can cancel your subscription at any time from your account settings.')}</Text>
              </Box>
              
              <Box textAlign="left">
                <Heading as="h3" size="md" mb={2}>
                  {t('pricing.faq.q3', 'What payment methods do you accept?')}
                </Heading>
                <Text>{t('pricing.faq.a3', 'We accept all major credit cards including Visa, Mastercard, and American Express. We also support PayPal.')}</Text>
              </Box>
              
              <Box textAlign="left">
                <Heading as="h3" size="md" mb={2}>
                  {t('pricing.faq.q4', 'Is there an annual discount?')}
                </Heading>
                <Text>{t('pricing.faq.a4', 'Yes, by choosing the annual plan, you get a 20% discount which is equivalent to two months free.')}</Text>
              </Box>
            </SimpleGrid>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common', 'pricing'])),
  },
});

export default Pricing;
