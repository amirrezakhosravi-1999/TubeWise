import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Flex,
  Divider,
  useColorModeValue,
  Spinner,
  useToast,
  Textarea,
  Input,
  FormControl,
  FormLabel,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Link as ChakraLink,
  List,
  ListItem,
  ListIcon,
  Progress,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { FaArrowLeft, FaCheck, FaTimes, FaInfoCircle, FaExternalLinkAlt, FaYoutube } from 'react-icons/fa';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

interface FactCheckResult {
  claim: string;
  is_correct: boolean;
  confidence: number;
  explanation: string;
  sources: {
    title: string;
    url: string;
    snippet: string;
  }[];
}

interface FactCheckResponse {
  results: FactCheckResult[];
  remaining_credits: number;
}

export default function FactCheck() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { videoId } = router.query;
  const toast = useToast();
  const auth = useAuth();
  
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [claims, setClaims] = useState<string[]>(['']);
  const [results, setResults] = useState<FactCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState(0);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  useEffect(() => {
    if (videoId) {
      // Get video info if videoId is provided
      fetchVideoInfo(typeof videoId === 'string' ? videoId : Array.isArray(videoId) ? videoId[0] : '');
      
      // Get remaining credits
      fetchRemainingCredits();
    }
  }, [videoId]);
  
  const fetchVideoInfo = async (id: string) => {
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/summarize/${id}`);
      
      if (response.data) {
        setVideoTitle(response.data.title || 'Unknown Video');
        setVideoUrl(`https://www.youtube.com/watch?v=${id}`);
      }
    } catch (error) {
      console.error('Error fetching video info:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch video information',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const fetchRemainingCredits = async () => {
    if (!auth.user) return;
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/users/${auth.user.id}/fact-check-credits`);
      setRemainingCredits(response.data.remaining_credits || 0);
    } catch (error) {
      console.error('Error fetching remaining credits:', error);
      // Silent fail - not critical
    }
  };
  
  const handleAddClaim = () => {
    setClaims([...claims, '']);
  };
  
  const handleRemoveClaim = (index: number) => {
    if (claims.length <= 1) return;
    const newClaims = [...claims];
    newClaims.splice(index, 1);
    setClaims(newClaims);
  };
  
  const handleClaimChange = (index: number, value: string) => {
    const newClaims = [...claims];
    newClaims[index] = value;
    setClaims(newClaims);
  };
  
  const handleSubmit = async () => {
    // Filter out empty claims
    const validClaims = claims.filter(claim => claim.trim() !== '');
    
    if (validClaims.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one claim to fact-check',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (!auth.user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to use the fact-checking feature',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(
        `${apiUrl}/api/fact-check`,
        {
          claims: validClaims,
          video_id: videoId,
          video_title: videoTitle,
          video_url: videoUrl
        },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );
      
      const data = response.data as FactCheckResponse;
      setResults(data.results);
      setRemainingCredits(data.remaining_credits);
      setLoading(false);
    } catch (error) {
      console.error('Error fact-checking claims:', error);
      setLoading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fact-check claims',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.5) return 'yellow';
    return 'red';
  };
  
  return (
    <>
      <Head>
        <title>{t('factCheck.title')} | TubeWise</title>
        <meta name="description" content={t('factCheck.description')} />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
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
                <Text fontSize="xl" mt={2}>
                  {t('factCheck.subtitle')}
                </Text>
              </Box>
              
              <Link href={videoId ? `/?videoId=${videoId}` : '/'} passHref>
                <Button leftIcon={<FaArrowLeft />} variant="outline">
                  {t('actions.back')}
                </Button>
              </Link>
            </Flex>
            
            {/* Video Info */}
            {videoId && (
              <Box p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
                <Heading size="md" mb={4}>{videoTitle}</Heading>
                <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Box width={{ base: '100%', md: '200px' }} flexShrink={0}>
                    <Box 
                      bgImage={`url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`}
                      bgSize="cover"
                      bgPosition="center"
                      borderRadius="md"
                      height="120px"
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" color="gray.500">
                      {t('factCheck.videoDescription')}
                    </Text>
                    <HStack mt={4} spacing={4}>
                      <Link href={`/?videoId=${videoId}`} passHref>
                        <Button size="sm" colorScheme="purple" variant="outline">
                          {t('factCheck.viewSummary')}
                        </Button>
                      </Link>
                      <Link href={videoUrl} passHref>
                        <Button 
                          as="a" 
                          size="sm" 
                          colorScheme="red" 
                          variant="outline"
                          target="_blank"
                          rel="noopener noreferrer"
                          leftIcon={<FaYoutube />}
                        >
                          {t('factCheck.viewOnYoutube')}
                        </Button>
                      </Link>
                    </HStack>
                  </Box>
                </Flex>
              </Box>
            )}
            
            {/* Claims Input */}
            <Box p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md">{t('factCheck.enterClaims')}</Heading>
                <HStack>
                  <Tooltip label={t('factCheck.creditsTooltip')}>
                    <Badge colorScheme={remainingCredits > 0 ? 'green' : 'red'} p={2} borderRadius="md">
                      {t('factCheck.remainingCredits')}: {remainingCredits}
                    </Badge>
                  </Tooltip>
                  <Tooltip label={t('factCheck.limitTooltip')}>
                    <Icon as={FaInfoCircle} color="gray.500" />
                  </Tooltip>
                </HStack>
              </Flex>
              
              <VStack spacing={4} align="stretch">
                {claims.map((claim, index) => (
                  <Flex key={index} gap={2}>
                    <FormControl>
                      <Textarea
                        value={claim}
                        onChange={(e) => handleClaimChange(index, e.target.value)}
                        placeholder={t('factCheck.claimPlaceholder')}
                        size="md"
                      />
                    </FormControl>
                    
                    {claims.length > 1 && (
                      <Button 
                        colorScheme="red" 
                        variant="ghost"
                        onClick={() => handleRemoveClaim(index)}
                      >
                        <FaTimes />
                      </Button>
                    )}
                  </Flex>
                ))}
                
                <HStack justify="space-between">
                  <Button 
                    onClick={handleAddClaim} 
                    colorScheme="purple" 
                    variant="outline"
                    isDisabled={claims.length >= (auth.user?.role === 'pro' ? 10 : 3)}
                  >
                    {t('factCheck.addClaim')}
                  </Button>
                  
                  <Button 
                    onClick={handleSubmit} 
                    colorScheme="purple"
                    isLoading={loading}
                    isDisabled={remainingCredits <= 0}
                  >
                    {t('factCheck.checkFacts')}
                  </Button>
                </HStack>
                
                {auth.user?.role !== 'pro' && (
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    {t('factCheck.upgradePrompt')}
                  </Text>
                )}
              </VStack>
            </Box>
            
            {/* Results */}
            {results.length > 0 && (
              <Box p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
                <Heading size="md" mb={6}>{t('factCheck.results')}</Heading>
                
                <VStack spacing={6} align="stretch">
                  {results.map((result, index) => (
                    <Card key={index} variant="outline">
                      <CardHeader bg={result.is_correct ? 'green.50' : 'red.50'} _dark={{ bg: result.is_correct ? 'green.900' : 'red.900' }}>
                        <Flex justify="space-between" align="center">
                          <HStack>
                            <Icon 
                              as={result.is_correct ? FaCheck : FaTimes} 
                              color={result.is_correct ? 'green.500' : 'red.500'} 
                              boxSize={5}
                            />
                            <Text fontWeight="bold">
                              {result.is_correct ? t('factCheck.correct') : t('factCheck.incorrect')}
                            </Text>
                          </HStack>
                          <Tooltip label={`${Math.round(result.confidence * 100)}% ${t('factCheck.confidence')}`}>
                            <Box width="100px">
                              <Progress 
                                value={result.confidence * 100} 
                                colorScheme={getConfidenceColor(result.confidence)}
                                size="sm"
                                borderRadius="full"
                              />
                            </Box>
                          </Tooltip>
                        </Flex>
                      </CardHeader>
                      
                      <CardBody>
                        <VStack align="start" spacing={4}>
                          <Box>
                            <Text fontWeight="bold">{t('factCheck.claim')}:</Text>
                            <Text>{result.claim}</Text>
                          </Box>
                          
                          <Box>
                            <Text fontWeight="bold">{t('factCheck.explanation')}:</Text>
                            <Text>{result.explanation}</Text>
                          </Box>
                          
                          <Box width="100%">
                            <Text fontWeight="bold" mb={2}>{t('factCheck.sources')}:</Text>
                            <List spacing={2}>
                              {result.sources.map((source, sourceIndex) => (
                                <ListItem key={sourceIndex}>
                                  <ListIcon as={FaExternalLinkAlt} color="purple.500" />
                                  <ChakraLink href={source.url} isExternal color="purple.500">
                                    {source.title}
                                  </ChakraLink>
                                  <Text fontSize="sm" mt={1} color="gray.600" _dark={{ color: 'gray.400' }}>
                                    "{source.snippet}"
                                  </Text>
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            )}
            
            {/* Upgrade Banner */}
            {auth.user?.role !== 'pro' && (
              <Box p={4} bg="yellow.50" _dark={{ bg: 'yellow.900' }} borderRadius="md">
                <Flex align="center" gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Icon as={FaInfoCircle} boxSize={6} color="yellow.500" />
                  <Box>
                    <Text fontWeight="bold">{t('factCheck.limitedAccess')}</Text>
                    <Text fontSize="sm">
                      {t('factCheck.upgradeMessage')}
                    </Text>
                  </Box>
                  <Button colorScheme="yellow" ml={{ base: 0, md: 'auto' }}>
                    {t('factCheck.upgradeToPro')}
                  </Button>
                </Flex>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
