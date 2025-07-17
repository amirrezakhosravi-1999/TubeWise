import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Image,
  Badge,
  Flex,
  Divider,
  useColorModeValue,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  useToast,
  Link as ChakraLink,
  Progress
} from '@chakra-ui/react';
import { FaYoutube, FaRegClock, FaRegBookmark, FaRegThumbsUp, FaShare, FaComment, FaPlus, FaRegFileAlt } from 'react-icons/fa';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/videoService';
import { Video, SavedVideo } from '../models/Video';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Dashboard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!auth.isAuthenticated && !auth.isLoading) {
      router.push('/login');
      return;
    }
    
    // Load saved videos
    if (auth.isAuthenticated) {
      fetchSavedVideos();
    }
  }, [auth.isAuthenticated, auth.isLoading]);
  
  const fetchSavedVideos = async () => {
    try {
      setLoading(true);
      const videos = await videoService.getSavedVideos();
      setSavedVideos(videos);
    } catch (error) {
      console.error('Error fetching saved videos:', error);
      toast({
        title: t('errors.generalError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveSavedVideo = async (videoId: string) => {
    try {
      await videoService.removeSavedVideo(videoId);
      
      // Update the list
      setSavedVideos(prev => prev.filter(v => v.videoId !== videoId));
      
      toast({
        title: t('favorites.removed'),
        description: t('favorites.removedDescription'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error removing video:', error);
      toast({
        title: t('errors.generalError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // If loading auth state, show loading spinner
  if (auth.isLoading) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="purple.500" />
      </Box>
    );
  }
  
  // If not authenticated, this will redirect (see useEffect)
  if (!auth.isAuthenticated) {
    return null;
  }
  
  return (
    <>
      <Head>
        <title>{t('dashboard.title')} | TubeWise</title>
        <meta name="description" content={t('dashboard.title')} />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Heading as="h1" size="2xl" color={accentColor}>
                  {t('appName')}
                </Heading>
                <Text fontSize="xl" mt={2}>
                  {t('dashboard.title')}
                  {auth.user?.name && `, ${auth.user.name}`}
                </Text>
              </Box>
              
              <HStack spacing={4}>
                <Link href="/" passHref>
                  <Button leftIcon={<FaPlus />} colorScheme="purple" variant="outline">
                    {t('summary.summarize')}
                  </Button>
                </Link>
                
                <Link href="/compare" passHref>
                  <Button leftIcon={<FaYoutube />} colorScheme="purple" variant="outline">
                    {t('compare.title')}
                  </Button>
                </Link>
                
                <Button 
                  colorScheme="purple" 
                  variant="ghost"
                  onClick={() => auth.logout().then(() => router.push('/'))}
                >
                  {t('auth.logout')}
                </Button>
              </HStack>
            </Flex>
            
            <Divider />
            
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList>
                <Tab>{t('dashboard.savedVideos')}</Tab>
                <Tab>{t('dashboard.history')}</Tab>
                <Tab>{t('dashboard.generatedContent')}</Tab>
                <Tab>{t('dashboard.usage')}</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  {loading ? (
                    <Box textAlign="center" py={10}>
                      <Spinner size="xl" color="purple.500" />
                      <Text mt={4}>{t('summary.analyzing')}</Text>
                    </Box>
                  ) : savedVideos.length === 0 ? (
                    <Box 
                      textAlign="center" 
                      py={10} 
                      borderWidth="1px" 
                      borderRadius="lg" 
                      borderStyle="dashed"
                      borderColor="gray.300"
                    >
                      <Icon as={FaRegBookmark} boxSize={12} color="gray.400" />
                      <Text mt={4} fontSize="xl" color="gray.500">
                        {t('dashboard.noSavedVideos')}
                      </Text>
                      <Link href="/" passHref>
                        <Button mt={6} colorScheme="purple">
                          {t('summary.summarize')}
                        </Button>
                      </Link>
                    </Box>
                  ) : (
                    <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6} mt={4}>
                      {savedVideos.map((savedVideo) => (
                        <GridItem key={savedVideo.id}>
                          <Card overflow="hidden" variant="outline" h="100%">
                            <Link 
                              href={`/?videoId=${savedVideo.video.videoId}`}
                              passHref
                            >
                              <Box position="relative" cursor="pointer">
                                <Image
                                  src={savedVideo.video.thumbnailUrl}
                                  alt={savedVideo.video.title}
                                  width="100%"
                                  height="auto"
                                  objectFit="cover"
                                  fallbackSrc="https://via.placeholder.com/640x360?text=Video+Thumbnail"
                                />
                                <Badge
                                  position="absolute"
                                  bottom="2"
                                  right="2"
                                  colorScheme="blackAlpha"
                                  px={2}
                                  py={1}
                                  borderRadius="md"
                                >
                                  <HStack spacing={1}>
                                    <Icon as={FaRegClock} />
                                    <Text>{savedVideo.video.duration}</Text>
                                  </HStack>
                                </Badge>
                              </Box>
                            </Link>
                            
                            <CardBody>
                              <Link 
                                href={`/?videoId=${savedVideo.video.videoId}`}
                                passHref
                              >
                                <Heading size="md" noOfLines={2} cursor="pointer" mb={2}>
                                  {savedVideo.video.title}
                                </Heading>
                              </Link>
                              
                              <Text fontSize="sm" color="gray.500">
                                {t('dashboard.savedAt')}: {new Date(savedVideo.savedAt).toLocaleDateString()}
                              </Text>
                            </CardBody>
                            
                            <CardFooter pt={0}>
                              <HStack spacing={2} width="100%">
                                <Link 
                                  href={`/?videoId=${savedVideo.video.videoId}`}
                                  passHref
                                  style={{ flex: 1 }}
                                >
                                  <Button 
                                    leftIcon={<FaComment />} 
                                    colorScheme="purple" 
                                    variant="ghost" 
                                    size="sm"
                                    width="100%"
                                  >
                                    {t('actions.chat')}
                                  </Button>
                                </Link>
                                
                                <Button 
                                  leftIcon={<FaRegBookmark />} 
                                  colorScheme="red" 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRemoveSavedVideo(savedVideo.videoId)}
                                >
                                  {t('actions.delete')}
                                </Button>
                              </HStack>
                            </CardFooter>
                          </Card>
                        </GridItem>
                      ))}
                    </Grid>
                  )}
                </TabPanel>
                
                {/* History Tab */}
                <TabPanel>
                  {loading ? (
                    <Box textAlign="center" py={10}>
                      <Spinner size="xl" color="purple.500" />
                      <Text mt={4}>{t('summary.analyzing')}</Text>
                    </Box>
                  ) : (
                    <Box>
                      <Heading size="md" mb={4}>{t('dashboard.recentActivity')}</Heading>
                      <VStack spacing={4} align="stretch">
                        {savedVideos.length > 0 ? (
                          savedVideos.map((savedVideo) => (
                            <Card key={savedVideo.id} variant="outline">
                              <CardBody>
                                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                                  <Box flexShrink={0} width={{ base: '100%', md: '180px' }}>
                                    <Image
                                      src={savedVideo.video.thumbnailUrl}
                                      alt={savedVideo.video.title}
                                      borderRadius="md"
                                      width="100%"
                                      height="auto"
                                      objectFit="cover"
                                      fallbackSrc="https://via.placeholder.com/320x180?text=Video+Thumbnail"
                                    />
                                  </Box>
                                  <Box flex={1}>
                                    <Flex justify="space-between" align="start" mb={2}>
                                      <Heading size="sm" noOfLines={2}>
                                        {savedVideo.video.title}
                                      </Heading>
                                      <Badge colorScheme="purple">
                                        {t('dashboard.summarized')}
                                      </Badge>
                                    </Flex>
                                    <Text fontSize="sm" color="gray.500" mb={2}>
                                      {new Date(savedVideo.savedAt).toLocaleString()}
                                    </Text>
                                    <HStack spacing={2}>
                                      <Link href={`/?videoId=${savedVideo.video.videoId}`} passHref>
                                        <Button size="sm" colorScheme="purple" variant="outline">
                                          {t('dashboard.viewSummary')}
                                        </Button>
                                      </Link>
                                      <Link href={`/chat?videoId=${savedVideo.video.videoId}`} passHref>
                                        <Button size="sm" colorScheme="purple" variant="ghost">
                                          {t('actions.chat')}
                                        </Button>
                                      </Link>
                                    </HStack>
                                  </Box>
                                </Flex>
                              </CardBody>
                            </Card>
                          ))
                        ) : (
                          <Box 
                            textAlign="center" 
                            py={10} 
                            borderWidth="1px" 
                            borderRadius="lg" 
                            borderStyle="dashed"
                            borderColor="gray.300"
                          >
                            <Icon as={FaRegClock} boxSize={12} color="gray.400" />
                            <Text mt={4} fontSize="xl" color="gray.500">
                              {t('dashboard.noHistory')}
                            </Text>
                            <Link href="/" passHref>
                              <Button mt={6} colorScheme="purple">
                                {t('summary.summarize')}
                              </Button>
                            </Link>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}
                </TabPanel>
                
                {/* Generated Content Tab */}
                <TabPanel>
                  {loading ? (
                    <Box textAlign="center" py={10}>
                      <Spinner size="xl" color="purple.500" />
                      <Text mt={4}>{t('summary.analyzing')}</Text>
                    </Box>
                  ) : (
                    <Box>
                      <Heading size="md" mb={4}>{t('dashboard.generatedContentTitle')}</Heading>
                      <VStack spacing={4} align="stretch">
                        {savedVideos.length > 0 ? (
                          savedVideos.slice(0, 3).map((savedVideo) => (
                            <Card key={`content-${savedVideo.id}`} variant="outline">
                              <CardBody>
                                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                                  <Box flexShrink={0} width={{ base: '100%', md: '180px' }}>
                                    <Image
                                      src={savedVideo.video.thumbnailUrl}
                                      alt={savedVideo.video.title}
                                      borderRadius="md"
                                      width="100%"
                                      height="auto"
                                      objectFit="cover"
                                      fallbackSrc="https://via.placeholder.com/320x180?text=Video+Thumbnail"
                                    />
                                  </Box>
                                  <Box flex={1}>
                                    <Flex justify="space-between" align="start" mb={2}>
                                      <Heading size="sm" noOfLines={2}>
                                        {savedVideo.video.title}
                                      </Heading>
                                      <HStack>
                                        <Badge colorScheme="twitter">
                                          Twitter
                                        </Badge>
                                        <Badge colorScheme="linkedin">
                                          LinkedIn
                                        </Badge>
                                      </HStack>
                                    </Flex>
                                    <Text fontSize="sm" color="gray.500" mb={2}>
                                      {t('dashboard.generatedOn')}: {new Date(savedVideo.savedAt).toLocaleDateString()}
                                    </Text>
                                    <HStack spacing={2}>
                                      <Link href={`/generate?videoId=${savedVideo.video.videoId}`} passHref>
                                        <Button size="sm" colorScheme="purple" variant="outline">
                                          {t('dashboard.viewContent')}
                                        </Button>
                                      </Link>
                                      <Link href={`/?videoId=${savedVideo.video.videoId}`} passHref>
                                        <Button size="sm" colorScheme="purple" variant="ghost">
                                          {t('dashboard.viewSummary')}
                                        </Button>
                                      </Link>
                                    </HStack>
                                  </Box>
                                </Flex>
                              </CardBody>
                            </Card>
                          ))
                        ) : (
                          <Box 
                            textAlign="center" 
                            py={10} 
                            borderWidth="1px" 
                            borderRadius="lg" 
                            borderStyle="dashed"
                            borderColor="gray.300"
                          >
                            <Icon as={FaRegFileAlt} boxSize={12} color="gray.400" />
                            <Text mt={4} fontSize="xl" color="gray.500">
                              {t('dashboard.noGeneratedContent')}
                            </Text>
                            <Link href="/" passHref>
                              <Button mt={6} colorScheme="purple">
                                {t('summary.summarize')}
                              </Button>
                            </Link>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}
                </TabPanel>
                
                {/* Usage Tab */}
                <TabPanel>
                  <Box>
                    <Heading size="md" mb={4}>{t('dashboard.usageStats')}</Heading>
                    
                    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                      {/* Video Summaries Usage */}
                      <Card variant="outline">
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <Heading size="sm">{t('dashboard.videoSummaries')}</Heading>
                            <Box w="100%">
                              <Flex justify="space-between" mb={1}>
                                <Text fontSize="sm">{t('dashboard.used')}: {4}</Text>
                                <Text fontSize="sm" fontWeight="bold">
                                  {auth.user?.role === 'pro' ? '4/100' : '4/5'}
                                </Text>
                              </Flex>
                              <Progress 
                                value={auth.user?.role === 'pro' ? (4/100)*100 : (4/5)*100} 
                                colorScheme="purple" 
                                size="sm" 
                                borderRadius="full" 
                              />
                            </Box>
                            {auth.user?.role !== 'pro' && (
                              <Button size="sm" colorScheme="purple" variant="outline" alignSelf="end">
                                {t('dashboard.upgradeForMore')}
                              </Button>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                      
                      {/* Video Comparisons Usage */}
                      <Card variant="outline">
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <Heading size="sm">{t('dashboard.videoComparisons')}</Heading>
                            <Box w="100%">
                              <Flex justify="space-between" mb={1}>
                                <Text fontSize="sm">{t('dashboard.used')}: {auth.user?.role === 'pro' ? 2 : 0}</Text>
                                <Text fontSize="sm" fontWeight="bold">
                                  {auth.user?.role === 'pro' ? '2/20' : '0/0'}
                                </Text>
                              </Flex>
                              <Progress 
                                value={auth.user?.role === 'pro' ? (2/20)*100 : 0} 
                                colorScheme="purple" 
                                size="sm" 
                                borderRadius="full" 
                              />
                            </Box>
                            {auth.user?.role !== 'pro' && (
                              <Button size="sm" colorScheme="purple" variant="outline" alignSelf="end">
                                {t('dashboard.upgradeForAccess')}
                              </Button>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                      
                      {/* Content Generation Usage */}
                      <Card variant="outline">
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <Heading size="sm">{t('dashboard.contentGeneration')}</Heading>
                            <Box w="100%">
                              <Flex justify="space-between" mb={1}>
                                <Text fontSize="sm">{t('dashboard.used')}: {auth.user?.role === 'pro' ? 8 : 3}</Text>
                                <Text fontSize="sm" fontWeight="bold">
                                  {auth.user?.role === 'pro' ? '8/50' : '3/10'}
                                </Text>
                              </Flex>
                              <Progress 
                                value={auth.user?.role === 'pro' ? (8/50)*100 : (3/10)*100} 
                                colorScheme="purple" 
                                size="sm" 
                                borderRadius="full" 
                              />
                            </Box>
                            {auth.user?.role !== 'pro' && (
                              <Button size="sm" colorScheme="purple" variant="outline" alignSelf="end">
                                {t('dashboard.upgradeForMore')}
                              </Button>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                      
                      {/* Subscription Info */}
                      <Card variant="outline" bg={auth.user?.role === 'pro' ? 'purple.50' : 'gray.50'} _dark={{ bg: auth.user?.role === 'pro' ? 'purple.900' : 'gray.700' }}>
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <Heading size="sm">{t('dashboard.currentPlan')}</Heading>
                            <Flex align="center" gap={2}>
                              <Badge colorScheme={auth.user?.role === 'pro' ? 'purple' : 'gray'} fontSize="md" px={2} py={1}>
                                {auth.user?.role === 'pro' ? t('plans.pro') : t('plans.free')}
                              </Badge>
                              {auth.user?.role === 'pro' && (
                                <Badge colorScheme="green">{t('dashboard.active')}</Badge>
                              )}
                            </Flex>
                            {auth.user?.role === 'pro' ? (
                              <Text fontSize="sm">{t('dashboard.nextBillingDate')}: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</Text>
                            ) : (
                              <Text fontSize="sm">{t('dashboard.freeUsage')}</Text>
                            )}
                            <Link href="/Subscription" passHref>
                              <Button size="sm" colorScheme="purple" alignSelf="end">
                                {auth.user?.role === 'pro' ? t('dashboard.managePlan') : t('dashboard.upgradeToPro')}
                              </Button>
                            </Link>
                          </VStack>
                        </CardBody>
                      </Card>
                    </Grid>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
      </Box>
    </>
  );
}