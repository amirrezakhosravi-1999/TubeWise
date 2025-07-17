import { useState, useEffect } from 'react';
import { getProviders, signIn, getCsrfToken } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Link as ChakraLink,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaGoogle, FaGithub, FaTwitter } from 'react-icons/fa';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// Get server-side props
export async function getServerSideProps(context: any) {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken(context);
  
  return {
    props: {
      providers,
      csrfToken,
      ...(await serverSideTranslations(context.locale || 'en', ['common'])),
    },
  };
}

// Provider icon mapping
const providerIcons: any = {
  google: <FaGoogle />,
  github: <FaGithub />,
  twitter: <FaTwitter />,
};

// Provider color mapping
const providerColors: any = {
  google: 'red',
  github: 'gray',
  twitter: 'twitter',
};

export default function SignIn({ providers, csrfToken }: { providers: any, csrfToken: string }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const toast = useToast();
  const { callbackUrl, error } = router.query;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // Handle error messages
  useEffect(() => {
    if (error) {
      let errorMessage = '';
      
      switch (error) {
        case 'OAuthSignin':
          errorMessage = t('auth.oauthSigninError');
          break;
        case 'OAuthCallback':
          errorMessage = t('auth.oauthCallbackError');
          break;
        case 'OAuthCreateAccount':
          errorMessage = t('auth.oauthCreateAccountError');
          break;
        case 'EmailCreateAccount':
          errorMessage = t('auth.emailCreateAccountError');
          break;
        case 'Callback':
          errorMessage = t('auth.callbackError');
          break;
        case 'OAuthAccountNotLinked':
          errorMessage = t('auth.oauthAccountNotLinked');
          break;
        case 'EmailSignin':
          errorMessage = t('auth.emailSigninError');
          break;
        case 'CredentialsSignin':
          errorMessage = t('auth.invalidCredentials');
          break;
        case 'SessionRequired':
          errorMessage = t('auth.sessionRequired');
          break;
        default:
          errorMessage = t('auth.unknownError');
      }
      
      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, t, toast]);

  // Validate form
  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};
    
    // Validate email
    if (!email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }
    
    // Validate password
    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle credentials sign in
  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: callbackUrl as string || '/dashboard',
      });
      
      if (result?.error) {
        setErrors({
          general: t('auth.loginFailed'),
        });
        
        toast({
          title: t('auth.loginFailed'),
          description: t('auth.invalidCredentials'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: t('auth.loginSuccess'),
          description: t('auth.welcomeBack'),
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Redirect to callback URL or dashboard
        router.push(callbackUrl as string || '/dashboard');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      
      setErrors({
        general: t('auth.loginFailed'),
      });
      
      toast({
        title: t('auth.loginFailed'),
        description: t('auth.unknownError'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth sign in
  const handleOAuthSignIn = (providerId: string) => {
    signIn(providerId, {
      callbackUrl: callbackUrl as string || '/dashboard',
    });
  };

  return (
    <>
      <Head>
        <title>{t('auth.signIn')} | TubeWise</title>
        <meta name="description" content={t('auth.signInDescription')} />
      </Head>
      
      <Box bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh" py={12}>
        <Container maxW="lg">
          <Box
            bg={useColorModeValue('white', 'gray.800')}
            p={8}
            borderRadius="lg"
            boxShadow="lg"
          >
            <VStack spacing={6} align="stretch">
              <Heading as="h1" size="xl" textAlign="center">
                {t('auth.signIn')}
              </Heading>
              
              {errors.general && (
                <Text color="red.500" textAlign="center">
                  {errors.general}
                </Text>
              )}
              
              <form onSubmit={handleCredentialsSignIn}>
                <Stack spacing={4}>
                  <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
                  
                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!errors.password}>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>
                  
                  <Flex justify="flex-end">
                    <ChakraLink as={Link} href="/auth/forgot-password" color="purple.500">
                      {t('auth.forgotPassword')}
                    </ChakraLink>
                  </Flex>
                  
                  <Button
                    type="submit"
                    colorScheme="purple"
                    size="lg"
                    isLoading={isLoading}
                    width="100%"
                  >
                    {t('auth.signIn')}
                  </Button>
                </Stack>
              </form>
              
              {/* OAuth login buttons are temporarily hidden
              <Flex align="center" my={6}>
                <Divider flex="1" />
                <Text px={3} color="gray.500">
                  {t('auth.orContinueWith')}
                </Text>
                <Divider flex="1" />
              </Flex>
              
              <HStack spacing={4} justify="center">
                {providers && Object.values(providers).map((provider: any) => {
                  // Skip credentials provider as we handle it separately
                  if (provider.id === 'credentials') return null;
                  
                  return (
                    <IconButton
                      key={provider.id}
                      aria-label={`Sign in with ${provider.name}`}
                      icon={providerIcons[provider.id] || <FaGoogle />}
                      onClick={() => handleOAuthSignIn(provider.id)}
                      colorScheme={providerColors[provider.id] || 'gray'}
                      variant="outline"
                      size="lg"
                    />
                  );
                })}
              </HStack>
              */}
              
              <Text mt={6} textAlign="center">
                {t('auth.noAccount')}{' '}
                <ChakraLink as={Link} href="/signup" color="purple.500">
                  {t('auth.signUp')}
                </ChakraLink>
              </Text>
            </VStack>
          </Box>
        </Container>
      </Box>
    </>
  );
}
