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
  VStack,
  IconButton,
  Checkbox
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

export default function SignUp() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: string;
    general?: string;
  }>({});
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      acceptTerms?: string;
    } = {};
    
    if (!name) {
      newErrors.name = t('auth.nameRequired');
    }
    
    if (!email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }
    
    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }
    
    if (!acceptTerms) {
      newErrors.acceptTerms = t('auth.acceptTermsRequired');
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
      // Use auth context to register
      await auth.register(name, email, password);
      
      toast({
        title: t('auth.signupSuccess'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect to dashboard after successful registration
      router.push('/dashboard');
    } catch (error) {
      setErrors({
        general: t('auth.signupFailed')
      });
      
      toast({
        title: t('auth.signupFailed'),
        description: error instanceof Error ? error.message : t('auth.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOAuthSignup = (provider: string) => {
    toast({
      title: t('auth.oauthNotImplemented'),
      description: `${provider} ${t('auth.signupNotAvailable')}`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };
  
  return (
    <>
      <Head>
        <title>Sign Up | TubeWise</title>
        <meta name="description" content="Create a new account on TubeWise to access all features" />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={12}>
        <Container maxW="md">
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Link href="/" passHref>
                <Heading
                  as="a"
                  size="xl"
                  color={accentColor}
                  cursor="pointer"
                  display="inline-block"
                >
                  TubeWise
                </Heading>
              </Link>
              <Text mt={2} fontSize="lg">
                Create a new account
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
                  
                  <FormControl isInvalid={!!errors.name}>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                  </FormControl>
                  
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
                  
                  <FormControl isInvalid={!!errors.confirmPassword}>
                    <FormLabel>Confirm Password</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!errors.acceptTerms}>
                    <Checkbox
                      isChecked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    >
                      I accept the{' '}
                      <Link href="/terms" passHref>
                        <ChakraLink color={accentColor}>
                          Terms and Conditions
                        </ChakraLink>
                      </Link>
                    </Checkbox>
                    <FormErrorMessage>{errors.acceptTerms}</FormErrorMessage>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="purple"
                    size="lg"
                    fontSize="md"
                    isLoading={isLoading}
                    width="full"
                    mt={4}
                  >
                    Sign Up
                  </Button>
                </Stack>
              </form>
              
              <Flex align="center" my={6}>
                <Divider flex="1" />
                <Text px={3} color="gray.500">
                  Or continue with
                </Text>
                <Divider flex="1" />
              </Flex>
              
              <HStack spacing={4} justify="center">
                <IconButton
                  aria-label="Sign up with Google"
                  icon={<FaGoogle />}
                  onClick={() => handleOAuthSignup('Google')}
                  colorScheme="red"
                  variant="outline"
                />
                <IconButton
                  aria-label="Sign up with GitHub"
                  icon={<FaGithub />}
                  onClick={() => handleOAuthSignup('GitHub')}
                  colorScheme="gray"
                  variant="outline"
                />
                <IconButton
                  aria-label="Sign up with Twitter"
                  icon={<FaTwitter />}
                  onClick={() => handleOAuthSignup('Twitter')}
                  colorScheme="twitter"
                  variant="outline"
                />
              </HStack>
            </Box>
            
            <Text textAlign="center">
              Already have an account?{' '}
              <Link href="/login" passHref>
                <ChakraLink color={accentColor}>
                  Log In
                </ChakraLink>
              </Link>
            </Text>
          </VStack>
        </Container>
      </Box>
    </>
  );
}
