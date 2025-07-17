import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import Link from 'next/link';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

// Error messages based on error type
const getErrorMessage = (error: string | string[] | undefined, t: any) => {
  if (!error) return t('auth.unknownError');

  const errorType = Array.isArray(error) ? error[0] : error;

  switch (errorType) {
    case 'Configuration':
      return t('auth.configurationError');
    case 'AccessDenied':
      return t('auth.accessDenied');
    case 'Verification':
      return t('auth.verificationError');
    case 'OAuthSignin':
      return t('auth.oauthSigninError');
    case 'OAuthCallback':
      return t('auth.oauthCallbackError');
    case 'OAuthCreateAccount':
      return t('auth.oauthCreateAccountError');
    case 'EmailCreateAccount':
      return t('auth.emailCreateAccountError');
    case 'Callback':
      return t('auth.callbackError');
    case 'OAuthAccountNotLinked':
      return t('auth.oauthAccountNotLinked');
    case 'EmailSignin':
      return t('auth.emailSigninError');
    case 'CredentialsSignin':
      return t('auth.invalidCredentials');
    case 'SessionRequired':
      return t('auth.sessionRequired');
    default:
      return t('auth.unknownError');
  }
};

export default function ErrorPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const { error } = router.query;
    if (error) {
      setErrorMessage(getErrorMessage(error, t));
    }
  }, [router.query, t]);

  return (
    <>
      <Head>
        <title>{t('auth.errorTitle')} | TubeWise</title>
        <meta name="description" content={t('auth.errorDescription')} />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={12}>
        <Container maxW="lg">
          <Box
            bg={cardBgColor}
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            textAlign="center"
          >
            <VStack spacing={6}>
              <Heading as="h1" size="xl">
                {t('auth.errorTitle')}
              </Heading>
              
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>{t('auth.errorOccurred')}</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Box>
              </Alert>
              
              <Text>{t('auth.tryAgainMessage')}</Text>
              
              <VStack spacing={4} width="100%">
                <Button
                  as={Link}
                  href="/login"
                  colorScheme="purple"
                  width="full"
                >
                  {t('auth.backToLogin')}
                </Button>
                
                <Button
                  as={Link}
                  href="/"
                  variant="outline"
                  width="full"
                >
                  {t('common.backToHome')}
                </Button>
              </VStack>
            </VStack>
          </Box>
        </Container>
      </Box>
    </>
  );
}
