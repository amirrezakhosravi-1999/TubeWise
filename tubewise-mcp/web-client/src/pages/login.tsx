import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Link as ChakraLink,
  FormErrorMessage,
  useToast,
  Flex,
  Divider,
  HStack,
  IconButton,
  VStack
} from '@chakra-ui/react';
import { FaGoogle, FaGithub, FaTwitter } from 'react-icons/fa';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useAuth } from '../contexts/AuthContext';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Login() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  
  // دریافت مسیر هدایت از پارامترهای URL
  const redirectPath = router.query.redirect as string || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};
    
    if (!email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }
    
    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use auth context to login
      await auth.login(email, password);
      
      toast({
        title: t('auth.loginSuccess'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (error) {
      setErrors({
        general: t('auth.loginFailed')
      });
      
      toast({
        title: t('auth.loginFailed'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOAuthLogin = async (provider: string) => {
    try {
      setIsLoading(true);
      
      // استفاده از NextAuth.js برای ورود با سرویس‌های OAuth
      const providerLower = provider.toLowerCase();
      
      // هدایت به صفحه احراز هویت NextAuth
      router.push(`/api/auth/signin/${providerLower}?callbackUrl=${encodeURIComponent(redirectPath || '/dashboard')}`);
      
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setErrors({
        ...errors,
        general: t('auth.loginFailed')
      });
      
      toast({
        title: t('auth.loginFailed'),
        description: error instanceof Error ? error.message : String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Head>
        <title>Log In | TubeWise</title>
        <meta name="description" content="Log in to your TubeWise account" />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={12}>
        <Container maxW="md">
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading
                as={Link}
                href="/"
                size="xl"
                color={accentColor}
                cursor="pointer"
                display="inline-block"
              >
                TubeWise
              </Heading>
              <Text mt={2} fontSize="lg">
                Log in to your account
              </Text>
            </Box>
            
            <Box
              bg={cardBgColor}
              p={8}
              borderRadius="lg"
              boxShadow="md"
            >
              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  {errors.general && (
                    <Text color="red.500" textAlign="center">
                      {errors.general}
                    </Text>
                  )}
                  
                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!errors.password}>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>
                  
                  <Box textAlign="right">
                    <ChakraLink as={Link} href="/forgot-password" color={accentColor} fontSize="sm">
                      Forgot Password?
                    </ChakraLink>
                  </Box>
                  
                  <Button
                    type="submit"
                    colorScheme="purple"
                    size="lg"
                    fontSize="md"
                    isLoading={isLoading}
                    width="full"
                    mt={4}
                  >
                    Log In
                  </Button>
                </Stack>
              </form>
              
              {/* OAuth login buttons are temporarily hidden
              <Flex align="center" my={6}>
                <Divider flex="1" />
                <Text px={3} color="gray.500">
                  Or continue with
                </Text>
                <Divider flex="1" />
              </Flex>
              
              <HStack spacing={4} justify="center">
                <IconButton
                  aria-label="Login with Google"
                  icon={<FaGoogle />}
                  onClick={() => handleOAuthLogin('Google')}
                  colorScheme="red"
                  variant="outline"
                />
                <IconButton
                  aria-label="Login with GitHub"
                  icon={<FaGithub />}
                  onClick={() => handleOAuthLogin('GitHub')}
                  colorScheme="gray"
                  variant="outline"
                />
                <IconButton
                  aria-label="Login with Twitter"
                  icon={<FaTwitter />}
                  onClick={() => handleOAuthLogin('Twitter')}
                  colorScheme="twitter"
                  variant="outline"
                />
              </HStack>
              */}
            </Box>
            
            <Text textAlign="center">
              Don't have an account?{' '}
              <ChakraLink as={Link} href="/signup" color={accentColor}>
                Sign Up
              </ChakraLink>
            </Text>
          </VStack>
        </Container>
      </Box>
    </>
  );
}