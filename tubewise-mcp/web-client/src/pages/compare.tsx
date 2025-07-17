import { useState, useEffect } from 'react';
import { convertTimestampToSeconds } from '../utils/timeUtils';
import { 
  Box, 
  Container, 
  Heading, 
  Input, 
  Button, 
  Text, 
  VStack, 
  HStack, 
  Divider, 
  useToast,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  IconButton,
  Flex,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import axios from 'axios';
import { FaPlus, FaTrash, FaYoutube, FaExchangeAlt, FaCrown, FaLock } from 'react-icons/fa';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { KeyPoint, Summary, ComparisonResult } from '../types';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

// Define types that are missing from ../types
interface UsageLimit {
  used: number;
  limit: number;
  allowed: boolean;
}

interface UserLimits {
  limits: {
    videos_compared: UsageLimit;
    comparisons?: UsageLimit;
  };
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Compare() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [videoUrls, setVideoUrls] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('free');
  const [usageLimits, setUsageLimits] = useState<UserLimits | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  const highlightColor = useColorModeValue('purple.50', 'purple.900');
  const proColor = useColorModeValue('yellow.400', 'yellow.300');
  const freeColor = useColorModeValue('gray.400', 'gray.500');
  const warningBgColor = useColorModeValue('orange.50', 'orange.900');
  const progressColorScheme = useColorModeValue('purple', 'purple');

  // Get authentication state from the auth context
  const auth = useAuth();
  
  // Fetch user data and usage limits on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if user is authenticated using auth context
        if (auth.isLoading) return;
        
        if (auth.isAuthenticated) {
          setIsAuthenticated(true);
          
          // Set user role based on auth context
          if (auth.isPro) {
            setUserRole('pro');
          } else {
            setUserRole('free');
          }
          
          // Get API URL from environment variable or use default
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          
          // Use user email as identifier if available
          const userIdentifier = auth.user?.email || '';
          
          try {
            // Fetch usage limits if API is available
            const limitsResponse = await axios.get(`${apiUrl}/api/user/${userIdentifier}/usage`);
            if (limitsResponse.data) {
              setUsageLimits(limitsResponse.data);
            } else {
              // Set demo limits for testing
              setUsageLimits({
                limits: {
                  videos_compared: {
                    used: 0,
                    limit: auth.isPro ? 100 : 5,
                    allowed: true
                  },
                  comparisons: {
                    used: 0,
                    limit: auth.isPro ? 20 : 2,
                    allowed: true
                  }
                }
              });
            }
          } catch (apiErr) {
            console.error('API Error:', apiErr);
            // Set defaults based on user role
            setUsageLimits({
              limits: {
                videos_compared: {
                  used: 0,
                  limit: auth.isPro ? 100 : 5,
                  allowed: true
                },
                comparisons: {
                  used: 0,
                  limit: auth.isPro ? 20 : 2,
                  allowed: true
                }
              }
            });
          }
        } else {
          setIsAuthenticated(false);
          setUserRole('free');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setIsAuthenticated(false);
      }
    };

    fetchUserData();
  }, [auth.isLoading, auth.isAuthenticated, auth.isPro, auth.user?.email]);

  const addVideoInput = () => {
    // Limit number of videos based on user role
    const maxVideos = userRole === 'pro' ? 10 : 3;
    if (videoUrls.length >= maxVideos) {
      toast({
        title: t('compare.maxVideosReached'),
        description: userRole === 'pro' 
          ? t('compare.maxProVideos', { count: maxVideos })
          : t('compare.maxFreeVideos', { count: maxVideos }),
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setVideoUrls([...videoUrls, '']);
  };

  const removeVideoInput = (index: number) => {
    const newUrls = [...videoUrls];
    newUrls.splice(index, 1);
    setVideoUrls(newUrls);
  };

  const updateVideoUrl = (index: number, value: string) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    setVideoUrls(newUrls);
  };

  const redirectToLogin = () => {
    router.push('/login?redirect=compare');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: t('auth.loginRequired'),
        description: t('auth.loginToCompare'),
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      redirectToLogin();
      return;
    }
    
    // Check if free user has reached their limit
    if (userRole === 'free' && usageLimits?.limits?.videos_compared) {
      const { used, limit } = usageLimits.limits.videos_compared;
      if (used >= limit) {
        toast({
          title: t('compare.limitReached'),
          description: t('compare.upgradeForMore'),
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }
    
    // Filter out empty URLs
    const validUrls = videoUrls.filter((url: string) => url.trim() !== '');
    
    // Check if user has reached their limit
    if (usageLimits && usageLimits.limits && usageLimits.limits.videos_compared && 
        !usageLimits.limits.videos_compared.allowed) {
      toast({
        title: t('compare.limitReached'),
        description: t('compare.limitReachedDesc', { 
          used: usageLimits.limits.videos_compared.used,
          limit: usageLimits.limits.videos_compared.limit
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (validUrls.length < 2) {
      setError(t('compare.error.twoVideos'));
      return;
    }
    
    // Check if user is authenticated for more than 2 videos
    if (validUrls.length > 2 && !isAuthenticated) {
      setError(t('compare.error.loginRequired'));
      return;
    }
    
    // Check if free user is trying to compare more than 2 videos
    if (validUrls.length > 2 && userRole === 'free') {
      setError(t('compare.error.upgradeRequired'));
      return;
    }
    
    // Check usage limits
    if (usageLimits && usageLimits.limits.comparisons) {
      const comparisonLimit = usageLimits.limits.comparisons;
      if (!comparisonLimit.allowed) {
        setError(t('compare.error.limitReached'));
        return;
      }
    }
    
    setLoading(true);
    setError('');
    setSummaries([]);
    setComparison(null);
    
    try {
      // Extract video IDs from URLs
      const videoIds = validUrls.map((url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/);
        return match ? match[1] : null;
      }).filter((id: string | null) => id !== null) as string[];
      
      if (videoIds.length < 2) {
        setError(t('compare.error.invalidUrls'));
        setLoading(false);
        return;
      }
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // First, get summaries for each video using the multiagent architecture
      const summaryPromises = videoIds.map(async (videoId) => {
        const summaryResponse = await axios.get(`${apiUrl}/api/summarize/${videoId}?agent=summary`);
        return summaryResponse.data;
      });
      
      const summaryResults = await Promise.all(summaryPromises);
      const formattedSummaries = summaryResults.map((result, index) => ({
        videoId: videoIds[index],
        title: result.title || `Video ${index + 1}`,
        summary: result.summary || '',
        keyPoints: result.key_points || [],
        url: validUrls[index],
        thumbnailUrl: `https://img.youtube.com/vi/${videoIds[index]}/maxresdefault.jpg`,
        duration: result.duration || '0:00'
      }));
      
      setSummaries(formattedSummaries);
      
      // Now call the comparison API to compare the videos
      const comparisonResponse = await axios.post(`${apiUrl}/api/compare`, {
        video_ids: videoIds,
        user_role: userRole
      });
      
      const data = comparisonResponse.data;
      console.log('API Response:', data); // Debug log
      
      // Update summaries if they're returned and different from what we already have
      if (data.summaries && Array.isArray(data.summaries)) {
        // Map returned summaries to our expected format
        const apiSummaries = data.summaries.map((summary: any, index: number) => ({
          videoId: summary.videoId || videoIds[index],
          title: summary.title || `Video ${index + 1}`,
          summary: summary.summary || '',
          keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
          url: validUrls[index] || '',
          thumbnailUrl: `https://img.youtube.com/vi/${summary.videoId || videoIds[index]}/maxresdefault.jpg`
        }));
        
        setSummaries(apiSummaries);
      }
      
      // Update comparison result
      if (data.comparison) {
        console.log('Setting comparison data:', data.comparison); // Debug log
        
        // Make sure comparison data is properly formatted for the frontend
        const formattedComparison = {
          commonTopics: Array.isArray(data.comparison.commonTopics) ? data.comparison.commonTopics : [],
          differences: Array.isArray(data.comparison.differences) ? data.comparison.differences : [],
          recommendation: data.comparison.recommendation || ''
        };
        
        console.log('Formatted comparison data:', formattedComparison);
        setComparison(formattedComparison);
      } else {
        console.error('No comparison data in response');
      }
      
      // Update user role from response if available
      if (data.user_role) {
        setUserRole(data.user_role);
      }
      
      // Show success message
      toast({
        title: t('compare.success'),
        description: t('compare.analysisComplete'),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setLoading(false);
      
      toast.closeAll();
      toast({
        title: t('summary.success'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (err: any) {
      console.error('Error:', err);
      
      // Handle specific API errors
      if (err.response && err.response.data && err.response.data.error) {
        if (err.response.data.error === 'Pro feature') {
          setError(t('compare.proFeature'));
          toast({
            title: t('compare.proFeature'),
            description: t('compare.upgradeToCompare'),
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else if (err.response.data.error === 'Usage limit reached') {
          setError(t('compare.limitReached'));
          toast({
            title: t('compare.limitReached'),
            description: err.response.data.message || t('compare.limitReachedDesc'),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        } else {
          setError(err.response.data.error || t('errors.generalError'));
          toast({
            title: t('errors.failedSummary'),
            description: err.response.data.message || t('errors.generalError'),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        setError(t('errors.generalError'));
        toast({
          title: t('errors.failedSummary'),
          description: t('errors.generalError'),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      
      setLoading(false);
      toast.closeAll();
    }
  };

  return (
    <>
      <Head>
        <title>{t('compare.title')} - {t('appName')}</title>
        <meta name="description" content={t('compare.description')} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={10}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Heading as="h1" size="2xl" color={accentColor}>
                  {t('appName')}
                </Heading>
                <Text fontSize="xl" mt={2}>
                  {t('compare.compareVideos')}
                </Text>
              </Box>
              <Link href="/" passHref>
                <Button as="a" colorScheme="gray">{t('compare.backToSummary')}</Button>
              </Link>
            </Flex>
            
            {/* Usage Limits Display */}
            {isAuthenticated && usageLimits && (
              <Box 
                bg={cardBgColor} 
                p={6} 
                borderRadius="lg" 
                boxShadow="md"
                mb={4}
              >
                <VStack spacing={4} align="stretch">
                  <Flex justifyContent="space-between" alignItems="center">
                    <Heading as="h2" size="md">
                      {t('usage.title')}
                    </Heading>
                    <Badge 
                      colorScheme={userRole === 'pro' ? 'yellow' : 'gray'}
                      fontSize="md"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      <Flex alignItems="center">
                        {userRole === 'pro' && <FaCrown style={{ marginRight: '0.5rem' }} />}
                        {userRole === 'pro' ? t('user.proPlan') : t('user.freePlan')}
                      </Flex>
                    </Badge>
                  </Flex>
                  
                  <Box>
                    <Flex justifyContent="space-between" mb={1}>
                      <Text fontWeight="medium">{t('usage.videosCompared')}</Text>
                      <Text>
                        {usageLimits.limits.videos_compared.used} / {usageLimits.limits.videos_compared.limit}
                      </Text>
                    </Flex>
                    <Progress 
                      value={(usageLimits.limits.videos_compared.used / usageLimits.limits.videos_compared.limit) * 100} 
                      colorScheme={progressColorScheme}
                      size="sm"
                      borderRadius="full"
                    />
                  </Box>
                  
                  {userRole === 'free' && (
                    <Alert status="warning" borderRadius="md" bg={warningBgColor}>
                      <AlertIcon />
                      <Box>
                        <AlertTitle>{t('compare.proFeature')}</AlertTitle>
                        <AlertDescription>
                          {t('compare.upgradeToCompare')}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </VStack>
              </Box>
            )}
            
            {/* Authentication warnings */}
            {!isAuthenticated && (
              <Alert status="warning" borderRadius="lg" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>{t('auth.loginRequired')}</AlertTitle>
                  <AlertDescription>
                    {t('auth.loginToCompare')}
                  </AlertDescription>
                </Box>
                <Button 
                  ml="auto" 
                  colorScheme="purple" 
                  size="sm"
                  onClick={redirectToLogin}
                >
                  {t('auth.login')}
                </Button>
              </Alert>
            )}
            
            {/* Show limit warning for free users who have reached their limit */}
            {isAuthenticated && userRole === 'free' && usageLimits?.limits?.videos_compared && 
             usageLimits.limits.videos_compared.used >= usageLimits.limits.videos_compared.limit && (
              <Alert status="warning" borderRadius="lg" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>{t('compare.limitReached')}</AlertTitle>
                  <AlertDescription>
                    {t('compare.upgradeForMore')}
                  </AlertDescription>
                </Box>
                <Button 
                  ml="auto" 
                  colorScheme="yellow" 
                  size="sm"
                  onClick={() => router.push('/pricing')}
                >
                  {t('user.upgradeToPro')}
                </Button>
              </Alert>
            )}
            
            <Box 
              bg={cardBgColor} 
              p={8} 
              borderRadius="lg" 
              boxShadow="md"
              as="form"
              onSubmit={handleSubmit}
            >
              <VStack spacing={4} align="stretch">
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading as="h2" size="md">
                    {t('compare.enterUrls')}
                  </Heading>
                  {/*!isAuthenticated && (
                    <Tooltip label={t('compare.proFeatureTooltip')}>
                      <Badge colorScheme="yellow">
                        <Flex alignItems="center">
                          <FaLock style={{ marginRight: '0.5rem' }} />
                          {t('compare.proOnly')}
                        </Flex>
                      </Badge>
                    </Tooltip>
                  */}
                </Flex>
                
                {videoUrls.map((url: string, index: number) => (
                  <HStack key={index}>
                    <Input 
                      placeholder={`${t('summary.enterUrl')} ${index + 1}`} 
                      value={url}
                      onChange={(e) => updateVideoUrl(index, e.target.value)}
                      isRequired={index < 2}
                    />
                    {index >= 2 && (
                      <IconButton
                        aria-label="Remove video"
                        icon={<FaTrash />}
                        onClick={() => removeVideoInput(index)}
                        colorScheme="red"
                        variant="ghost"
                      />
                    )}
                  </HStack>
                ))}
                
                <HStack>
                  <Button 
                    leftIcon={<FaPlus />} 
                    onClick={addVideoInput}
                    size="sm"
                    variant="outline"
                  >
                    {t('compare.addVideo')}
                  </Button>
                  
                  <Button 
                    type="submit" 
                    colorScheme="purple" 
                    leftIcon={<FaExchangeAlt />}
                    isLoading={loading}
                    loadingText={t('compare.comparingVideos')}
                    isDisabled={!isAuthenticated || (userRole === 'free' && usageLimits?.limits?.videos_compared && 
                      usageLimits.limits.videos_compared.used >= usageLimits.limits.videos_compared.limit)} // Only disable if not authenticated or free user at limit
                  >
                    {t('compare.compareButton')}
                  </Button>
                </HStack>
                
                {error && (
                  <Text color="red.500" mt={2}>
                    {error}
                  </Text>
                )}
              </VStack>
            </Box>
            
            {loading && (
              <Box textAlign="center" p={10}>
                <Spinner size="xl" color="purple.500" />
                <Text mt={4} fontSize="lg">
                  {t('compare.comparingVideos')}
                </Text>
              </Box>
            )}
            
            {!loading && summaries.length > 0 && (
              <Box bg={cardBgColor} p={8} borderRadius="lg" boxShadow="md">
                <Tabs variant="enclosed" colorScheme="purple">
                  <TabList>
                    {summaries.map((summary: Summary, index: number) => (
                      <Tab key={index}>
                        <HStack>
                          <FaYoutube />
                          <Text>{`${t('summary.summaryHeading')} ${index + 1}`}</Text>
                        </HStack>
                      </Tab>
                    ))}
                    
                    {comparison && (
                      <Tab>
                        <HStack>
                          <FaExchangeAlt />
                          <Text>{t('compare.title')}</Text>
                        </HStack>
                      </Tab>
                    )}
                  </TabList>
                  
                  <TabPanels>
                    {summaries.map((summary: Summary, index: number) => (
                      <TabPanel key={index}>
                        <VStack spacing={6} align="stretch">
                          <Heading as="h2" size="lg" color={accentColor}>
                            {summary.title}
                          </Heading>
                          
                          <Box>
                            <Heading as="h3" size="md" mb={2}>
                              {t('summary.summaryHeading')}
                            </Heading>
                            <Text fontSize="lg">{summary.summary}</Text>
                          </Box>
                          
                          <Divider />
                          
                          <Box>
                            <Heading as="h3" size="md" mb={4}>
                              {t('summary.keyPoints')}
                            </Heading>
                            
                            <VStack align="stretch" spacing={3}>
                              {summary.keyPoints.map((point: KeyPoint, idx: number) => (
                                <Box key={idx} p={3} borderLeft="4px" borderColor={accentColor} bg={highlightColor}>
                                  <Flex>
                                    <Button
                                      as="a"
                                      href={`https://www.youtube.com/watch?v=${summary.videoId}&t=${convertTimestampToSeconds(point.timestamp)}`}
                                      target="_blank"
                                      size="sm"
                                      colorScheme="purple"
                                      variant="link"
                                      fontWeight="bold"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        window.open(`https://www.youtube.com/watch?v=${summary.videoId}&t=${convertTimestampToSeconds(point.timestamp)}`, '_blank');
                                      }}
                                    >
                                      [{point.timestamp}]
                                    </Button>
                                    <Text as="span" ml={2}>
                                      {point.point}
                                    </Text>
                                  </Flex>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                        </VStack>
                      </TabPanel>
                    ))}
                    
                    {comparison && (
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Heading as="h2" size="lg" color={accentColor}>
                            {t('compare.title')}
                          </Heading>
                          
                          <Box>
                            <Heading as="h3" size="md" mb={2}>
                              {t('compare.comprehensiveComparison')}
                            </Heading>
                            <Text mb={4} fontSize="md" color="gray.600">
                              A detailed analysis comparing insights from multiple videos, highlighting key connections, differences, and unique perspectives.
                            </Text>
                          </Box>

                          <Box>
                            <Heading as="h3" size="md" mb={2}>
                              {t('compare.commonTopics')}
                            </Heading>
                            <VStack align="stretch" spacing={2}>
                              {comparison.commonTopics.map((topic: string, idx: number) => (
                                <Box key={idx} p={3} bg="green.50" borderRadius="md" borderLeft="4px" borderColor="green.400">
                                  <Text>{topic}</Text>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                          
                          <Box>
                            <Heading as="h3" size="md" mb={2}>
                              {t('compare.keyDifferences')}
                            </Heading>
                            <VStack align="stretch" spacing={2}>
                              {(comparison.differences || []).map((diff: string, idx: number) => (
                                <Box key={idx} p={3} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
                                  <Text>{diff}</Text>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                          
                          <Box p={4} bg={highlightColor} borderRadius="md" borderLeft="4px" borderColor={accentColor}>
                            <Heading as="h3" size="md" mb={2}>
                              {t('compare.recommendation')}
                            </Heading>
                            <Text>{comparison.recommendation}</Text>
                          </Box>
                        </VStack>
                      </TabPanel>
                    )}
                  </TabPanels>
                </Tabs>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
