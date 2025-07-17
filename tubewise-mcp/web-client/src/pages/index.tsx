import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  Link as ChakraLink,
  List,
  ListItem,
  ListIcon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import CustomButton from '../components/common/CustomButton';
import {
  FaYoutube,
  FaArrowRight,
  FaPlus,
  FaRegClock,
  FaRegLightbulb,
  FaRegComments,
  FaExternalLinkAlt,
  FaTwitter,
  FaLinkedin,
  FaRegFileAlt,
  FaEllipsisV,
  FaRegBookmark,
  FaBookmark,
  FaCheck,
  FaRegThumbsUp,
  FaSearch,
  FaComment,
  FaShare,
} from 'react-icons/fa';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Head from 'next/head';
import Layout from '../components/Layout';
import { VideoSummary, KeyPoint, ChatMessage, ChatResponse } from '../types';
import { API_BASE_URL } from '../config';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Client-side only components
const ClientSideOnly = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient ? children : null;
};

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { videoId } = router.query;
  const auth = useAuth();
  
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTimeSegment, setActiveTimeSegment] = useState<number | null>(null);
  const [timelineSuggestions, setTimelineSuggestions] = useState<TimelineSuggestion[]>([]);
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  // Client-side only code
  useEffect(() => {
    if (videoId) {
      fetchSummaryById(typeof videoId === 'string' ? videoId : Array.isArray(videoId) ? videoId[0] : '');
    }
  }, [videoId]);
  
  const fetchSummaryById = async (id: string) => {
    try {
      setLoading(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/summarize/${id}`);
      const data = response.data;
      
      // Create a proper VideoSummary object
      const summaryObj: VideoSummary = {
        id: uuidv4(),
        videoId: id,
        title: data.title || 'Unknown title',
        summary: data.summary || '',
        keyPoints: data.keyPoints || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setSummary(summaryObj);
      setLoading(false);
      
      // Check if this video is saved
      if (auth.user) {
        checkIfVideoSaved(id);
      }
      
    } catch (error) {
      console.error('Error fetching summary:', error);
      setLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to fetch video summary. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const checkIfVideoSaved = async (id: string) => {
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/users/${auth.user?.id}/saved-videos`);
      const savedVideos = response.data;
      
      const isSavedVideo = savedVideos.some((savedVideo: any) => savedVideo.videoId === id);
      setIsSaved(isSavedVideo);
      
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) return;
    
    try {
      setLoading(true);
      
      // Extract video ID from URL
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/);
      const extractedVideoId = videoIdMatch ? videoIdMatch[1] : null;
      
      if (!extractedVideoId) {
        toast({
          title: 'Error',
          description: 'Invalid YouTube video URL.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }
      
      // Redirect to same page with videoId query param
      router.push({
        pathname: '/',
        query: { videoId: extractedVideoId },
      });
      
    } catch (error) {
      console.error('Error processing URL:', error);
      setLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to process video URL. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleSaveVideo = async () => {
    if (!summary || !auth.user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save videos.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      if (isSaved) {
        // Remove from saved videos
        await axios.delete(`${apiUrl}/api/users/${auth.user.id}/saved-videos/${summary.videoId}`);
        setIsSaved(false);
        toast({
          title: 'Success',
          description: 'Video removed from saved videos.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Add to saved videos
        await axios.post(`${apiUrl}/api/users/${auth.user.id}/saved-videos`, {
          videoId: summary.videoId,
          title: summary.title,
          thumbnailUrl: `https://img.youtube.com/vi/${summary.videoId}/maxresdefault.jpg`,
        });
        setIsSaved(true);
        toast({
          title: 'Success',
          description: 'Video saved successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: 'Failed to save video. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!summary || !chatInput.trim()) return;
    
    // Create a new user message
    const newMessage: ChatMessage = {
      id: uuidv4(),
      videoId: summary.videoId,
      message: chatInput,
      sender: 'user',
      timestamp: new Date(),
      timelineSuggestions: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      // تعیین URL سرویس AI با استفاده از متغیرهای محیطی
      let apiUrl = 'http://localhost:8000';
      
      // استفاده از URL ثابت برای اطمینان از ارتباط صحیح
      console.log(`Using fixed API URL for chat: ${apiUrl}`);
      
      // برای اطمینان از عملکرد صحیح، از CORS استفاده می‌کنیم
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      console.log(`Sending chat message to API: ${chatInput}`);
      const response = await axios.post(`${apiUrl}/api/chat`, {
        videoId: summary.videoId,
        message: chatInput,
        user_role: auth.user?.role || 'free'
      }, { headers });
      
      console.log('Received chat response:', response.data);
      const responseData: ChatResponse = response.data;
      
      // استفاده از timelineSuggestions با اولویت (camelCase برای سازگاری با فرانت‌اند)
      const suggestions = responseData.timelineSuggestions || responseData.timeline_suggestions || [];
      console.log('Timeline suggestions:', suggestions);
      
      // Update timeline suggestions if available
      if (suggestions && suggestions.length > 0) {
        setTimelineSuggestions(suggestions);
      }
      
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        videoId: summary.videoId,
        message: '',
        response: responseData.response || responseData.answer || 'No response received from AI service.',
        sender: 'ai',
        timestamp: new Date(),
        timelineSuggestions: suggestions
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      
      // نمایش پیام خطا به کاربر و اضافه کردن پیام خطا به چت
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        videoId: summary.videoId,
        message: '',
        response: `Error: ${error.message || 'Failed to connect to AI service. Please try again later.'}`,
        sender: 'ai',
        timestamp: new Date(),
        timelineSuggestions: []
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'خطا',
        description: 'مشکلی در ارسال پیام چت رخ داد. لطفاً دوباره تلاش کنید.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setChatLoading(false);
    }
  };
  
  const handleTimelineClick = (timestamp: string) => {
    if (!summary) return;
    
    // Convert timestamp to seconds
    const parts = timestamp.split(':');
    let seconds = 0;
    
    if (parts.length === 3) {
      // HH:MM:SS format
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS format
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      // SS format
      seconds = parseInt(parts[0]);
    }
    
    setActiveTimeSegment(seconds);
    
    // Open YouTube at specific timestamp
    window.open(`https://www.youtube.com/watch?v=${summary.videoId}&t=${seconds}s`, '_blank');
  };
  
  // Function to render text with clickable timestamps
  const renderTextWithClickableTimestamps = (text: string) => {
    if (!text) return null;
    
    // Regex to match timestamps in various formats
    // This matches formats like: 00:38, 0:00:38, 01:08, 0:01:16 - 0:02:25, etc.
    // Also matches formats like: 1. Key point - 01:08, Timestamp: 0:01:16 - 0:02:25
    const timestampRegex = /\b(\d{1,2}:\d{2}(:\d{2})?(\s*-\s*\d{1,2}:\d{2}(:\d{2})?)?)\b/g;
    
    // Create a copy of the text to work with
    let processedText = text;
    const matches = text.match(timestampRegex) || [];
    const result: React.ReactNode[] = [];
    
    // If no timestamps found, return the original text
    if (matches.length === 0) {
      return text;
    }
    
    // Process each match
    let lastIndex = 0;
    let match;
    
    // Reset the regex to start from the beginning
    timestampRegex.lastIndex = 0;
    
    while ((match = timestampRegex.exec(text)) !== null) {
      // Add text before the timestamp
      if (match.index > lastIndex) {
        result.push(
          <React.Fragment key={`text-${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </React.Fragment>
        );
      }
      
      // Extract the timestamp
      const timestamp = match[0];
      // Extract the first timestamp if there's a range
      const firstTimestamp = timestamp.split('-')[0].trim();
      
      // Add the clickable timestamp
      result.push(
        <Badge
          key={`timestamp-${match.index}`}
          colorScheme="purple"
          fontSize="sm"
          p={1}
          mx={1}
          cursor="pointer"
          onClick={() => handleTimelineClick(firstTimestamp)}
        >
          {timestamp}
        </Badge>
      );
      
      // Update the last index
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      result.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </React.Fragment>
      );
    }
    
    return result;
  };
  
  return (
    <>
      <Head>
        <title>{summary ? `${summary.title} | TubeWise` : 'TubeWise - YouTube Summaries'}</title>
        <meta name="description" content="Get AI-powered summaries of YouTube videos with TubeWise" />
      </Head>
      
      <Container maxW="container.xl" pt={5} pb={10}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Flex 
            justify="space-between" 
            align="center" 
            wrap={{ base: 'wrap', md: 'nowrap' }}
            gap={4}
          >
            <Heading as="h1" size="xl" color={accentColor}>
              TubeWise
            </Heading>
            
            <HStack spacing={4}>
              {auth.isAuthenticated ? (
                <>
                  <Link href="/dashboard" passHref>
                    <CustomButton leftIcon={<FaRegBookmark />} variant="outline" colorScheme="purple">
                      Dashboard
                    </CustomButton>
                  </Link>
                  <Link href="/compare" passHref>
                    <CustomButton leftIcon={<FaSearch />} variant="outline" colorScheme="purple">
                      Compare
                    </CustomButton>
                  </Link>
                  <CustomButton 
                    onClick={() => {
                      auth.logout();
                      router.push('/');
                    }}
                    variant="ghost"
                  >
                    Logout
                  </CustomButton>
                </>
              ) : (
                <>
                  <Link href="/login" passHref>
                    <CustomButton variant="outline" colorScheme="purple">
                      Log In
                    </CustomButton>
                  </Link>
                  <Link href="/signup" passHref>
                    <CustomButton colorScheme="purple">
                      Sign Up
                    </CustomButton>
                  </Link>
                </>
              )}
            </HStack>
          </Flex>
          
          {/* Hero Section */}
          {!summary && !loading && (
            <Box 
              w="full" 
              py={20} 
              className="hero-gradient" 
              borderRadius="lg" 
              mb={10}
            >
              <Container maxW="container.xl">
                <VStack spacing={6} align="center" textAlign="center" className="fade-in">
                  <Heading size="2xl" color="white">
                    Unlock the Power of YouTube
                  </Heading>
                  <Text fontSize="xl" maxW="container.md" color="white" opacity={0.9}>
                    Get instant summaries, key points with timestamps, and interactive chat with any YouTube video. Save time and extract valuable insights.
                  </Text>
                  
                  <Box w="full" maxW="container.md" mt={6}>
                    <form onSubmit={handleSubmit}>
                      <Flex 
                        direction={{ base: 'column', md: 'row' }} 
                        gap={4}
                      >
                        <Input 
                          placeholder="Enter a YouTube video URL"
                          size="lg"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          flex={1}
                          bg="white"
                          color="gray.800"
                          borderColor="transparent"
                          _hover={{ borderColor: 'white' }}
                          _focus={{ borderColor: 'white', boxShadow: '0 0 0 1px white' }}
                        />
                        <CustomButton 
                          type="submit" 
                          bg="white"
                          color="purple.600"
                          _hover={{ bg: 'gray.100' }}
                          size="lg" 
                          rightIcon={<FaArrowRight />}
                          isLoading={loading}
                          loadingText="Analyzing..."
                          minW={{ base: 'full', md: '200px' }}
                          className="animated-button"
                        >
                          Summarize
                        </CustomButton>
                      </Flex>
                    </form>
                  </Box>
                </VStack>
              </Container>
            </Box>
          )}
          
          {/* Features Section */}
          {!summary && !loading && (
            <Container maxW="container.xl" className="slide-up">
              <VStack spacing={10} align="center" textAlign="center">
                <Heading size="xl">How TubeWise Works</Heading>
                
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="full">
                  <VStack spacing={4} p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md" className="feature-card">
                    <Icon as={FaRegLightbulb} boxSize={10} color="purple.500" />
                    <Heading size="md">Key Points</Heading>
                    <Text textAlign="center">Get the most important points from the video with timestamps for easy navigation.</Text>
                  </VStack>
                  
                  <VStack spacing={4} p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md" className="feature-card">
                    <Icon as={FaRegComments} boxSize={10} color="purple.500" />
                    <Heading size="md">Smart Chat</Heading>
                    <Text textAlign="center">Ask questions about the video content and get intelligent answers based on the context.</Text>
                  </VStack>
                  
                  <VStack spacing={4} p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md" className="feature-card">
                    <Icon as={FaShare} boxSize={10} color="purple.500" />
                    <Heading size="md">Content Generation</Heading>
                    <Text textAlign="center">Create social media posts, articles, and notes from the video with just one click.</Text>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </Container>
          )}
          
          {/* Additional Info Section */}
          {!summary && !loading && (
            <Box py={20} bg={useColorModeValue('gray.50', 'gray.900')} mt={20}>
              <Container maxW="container.xl">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
                  <Box>
                    <Heading mb={5}>Why Use TubeWise?</Heading>
                    <VStack align="start" spacing={4}>
                      <HStack align="start" spacing={4}>
                        <Box 
                          p={2} 
                          bg="purple.500" 
                          color="white" 
                          borderRadius="md"
                          fontSize="xl"
                        >
                          1
                        </Box>
                        <Box>
                          <Heading size="md" mb={2}>Save Time</Heading>
                          <Text>Get the key points from long videos without watching the entire content. Perfect for research and learning.</Text>
                        </Box>
                      </HStack>
                      
                      <HStack align="start" spacing={4}>
                        <Box 
                          p={2} 
                          bg="purple.500" 
                          color="white" 
                          borderRadius="md"
                          fontSize="xl"
                        >
                          2
                        </Box>
                        <Box>
                          <Heading size="md" mb={2}>Interactive Learning</Heading>
                          <Text>Ask questions about the video content and get instant answers. Clarify concepts without searching elsewhere.</Text>
                        </Box>
                      </HStack>
                      
                      <HStack align="start" spacing={4}>
                        <Box 
                          p={2} 
                          bg="purple.500" 
                          color="white" 
                          borderRadius="md"
                          fontSize="xl"
                        >
                          3
                        </Box>
                        <Box>
                          <Heading size="md" mb={2}>Content Creation</Heading>
                          <Text>Create social media posts, articles, and study notes from videos with just one click.</Text>
                        </Box>
                      </HStack>
                    </VStack>
                  </Box>
                  
                  <Box>
                    <Image 
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80" 
                      alt="TubeWise in action" 
                      borderRadius="lg"
                      boxShadow="lg"
                    />
                  </Box>
                </SimpleGrid>
              </Container>
            </Box>
          )}
          
          {loading && (
            <Box textAlign="center" py={20}>
              <Spinner size="xl" color="purple.500" />
              <Text mt={4} fontSize="xl">Analyzing...</Text>
            </Box>
          )}
          
          {summary && !loading && (
            <Box>
              <HStack spacing={4} mb={6}>
                <CustomButton 
                  leftIcon={<FaArrowRight />} 
                  variant="outline" 
                  colorScheme="purple"
                  onClick={() => {
                    setSummary(null);
                    setUrl('');
                    router.push('/');
                  }}
                >
                  New Summary
                </CustomButton>
                
                {auth.user && (
                  <CustomButton
                    leftIcon={isSaved ? <FaBookmark /> : <FaRegBookmark />}
                    colorScheme="purple"
                    variant={isSaved ? "solid" : "outline"}
                    onClick={handleSaveVideo}
                  >
                    {isSaved ? 'Saved' : 'Save'}
                  </CustomButton>
                )}
                
                <Link href={`/generate?videoId=${summary.videoId}`} passHref>
                  <CustomButton leftIcon={<FaRegFileAlt />} colorScheme="purple" variant="outline">
                    Generate Content
                  </CustomButton>
                </Link>
                
                <ChakraLink href={`https://www.youtube.com/watch?v=${summary.videoId}`} isExternal>
                  <CustomButton rightIcon={<FaExternalLinkAlt />} colorScheme="red" variant="outline">
                    Watch on YouTube
                  </CustomButton>
                </ChakraLink>
              </HStack>
              
              <Box mb={6}>
                <Heading size="lg" mb={2}>{summary.title}</Heading>
                <HStack spacing={4}>
                  <Badge colorScheme="purple" fontSize="sm">YouTube</Badge>
                  {auth.user?.role === 'pro' && (
                    <Badge colorScheme="green" fontSize="sm">Pro</Badge>
                  )}
                </HStack>
              </Box>
              
              <Flex 
                direction={{ base: 'column', lg: 'row' }} 
                gap={6}
                align="start"
              >
                {/* Video Thumbnail */}
                <Box 
                  width={{ base: '100%', lg: '400px' }} 
                  flexShrink={0}
                  position="relative"
                >
                  <Image 
                    src={`https://img.youtube.com/vi/${summary.videoId}/maxresdefault.jpg`}
                    alt={summary.title}
                    width="100%"
                    height="auto"
                    borderRadius="lg"
                    fallbackSrc="https://via.placeholder.com/640x360?text=Video+Thumbnail"
                  />
                  <Link href={`https://www.youtube.com/watch?v=${summary.videoId}`} passHref>
                    <CustomButton 
                      leftIcon={<FaYoutube />} 
                      colorScheme="red" 
                      position="absolute" 
                      bottom={4} 
                      left="50%" 
                      transform="translateX(-50%)"
                    >
                      Watch Video
                    </CustomButton>
                  </Link>
                </Box>
                
                {/* Summary Content */}
                <Box flex="1">
                  <Tabs colorScheme="purple" variant="enclosed" index={activeTab} onChange={setActiveTab}>
                    <TabList>
                      <Tab>Summary</Tab>
                      <Tab>Key Points</Tab>
                      <Tab>Chat</Tab>
                    </TabList>
                    
                    <TabPanels>
                      {/* Summary Tab */}
                      <TabPanel>
                        <VStack align="stretch" spacing={6}>
                          <Heading 
                            size="lg" 
                            mb={4} 
                            bgGradient="linear(to-r, purple.500, pink.500)" 
                            bgClip="text"
                            fontWeight="extrabold"
                            textAlign="center"
                            pb={2}
                            borderBottom="2px solid"
                            borderColor="purple.200"
                            width="100%"
                          >
                            AI Summary
                          </Heading>
                          
                          <Box 
                            p={6} 
                            borderRadius="lg" 
                            boxShadow="md" 
                            bg="white" 
                            _dark={{ bg: 'gray.800' }}
                            borderLeft="4px solid"
                            borderColor="purple.400"
                          >
                            <Box className="summary-content" whiteSpace="pre-line">
                              {renderTextWithClickableTimestamps(summary.summary)}
                            </Box>
                          </Box>
                          
                          <Box mt={6}>
                            <HStack spacing={4} mt={6} justifyContent="center">
                              <Link href={`/generate?videoId=${summary.videoId}`} passHref>
                                <CustomButton leftIcon={<FaTwitter />} colorScheme="twitter" size="sm">
                                  Share on Twitter
                                </CustomButton>
                              </Link>
                              <Link href={`/generate?videoId=${summary.videoId}`} passHref>
                                <CustomButton leftIcon={<FaLinkedin />} colorScheme="linkedin" size="sm">
                                  Share on LinkedIn
                                </CustomButton>
                              </Link>
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  aria-label="Options"
                                  icon={<FaEllipsisV />}
                                  variant="outline"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem icon={<FaRegFileAlt />}>
                                    Export to Notion
                                  </MenuItem>
                                  <MenuItem icon={<FaRegThumbsUp />}>
                                    Provide Feedback
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          </Box>
                        </VStack>
                      </TabPanel>
                      
                      {/* Key Points Tab */}
                      <TabPanel>
                        <VStack align="stretch" spacing={4}>
                          <Heading size="md" mb={2}>Key Points with Timestamps</Heading>
                          
                          <List spacing={3}>
                            {summary.keyPoints && summary.keyPoints.length > 0 ? (
                              summary.keyPoints.map((point, index) => (
                                <ListItem key={index}>
                                  <HStack align="start" spacing={3}>
                                    <Badge 
                                      colorScheme="purple" 
                                      fontSize="sm" 
                                      p={1} 
                                      cursor="pointer"
                                      onClick={() => handleTimelineClick(point.timestamp)}
                                    >
                                      {point.timestamp}
                                    </Badge>
                                    <Box>{renderTextWithClickableTimestamps(point.point)}</Box>
                                  </HStack>
                                </ListItem>
                              ))
                            ) : (
                              <Text color="gray.500">No key points available</Text>
                            )}
                          </List>
                        </VStack>
                      </TabPanel>
                      
                      {/* Chat Tab */}
                      <TabPanel>
                        <VStack align="stretch" spacing={4} height="400px">
                          <Box flex="1" overflowY="auto" p={3} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
                            {chatMessages.length === 0 ? (
                              <Text color="gray.500" textAlign="center" mt={10}>
                                Ask a question about the video content
                              </Text>
                            ) : (
                              <VStack spacing={4} align="stretch" mt={4}>
                                {chatMessages.map((msg) => (
                                  <Box 
                                    key={msg.id}
                                    bg={msg.sender === 'ai' ? 'purple.50' : 'gray.50'}
                                    _dark={{ bg: msg.sender === 'ai' ? 'purple.900' : 'gray.700' }}
                                    p={3}
                                    borderRadius="md"
                                    borderLeftWidth={msg.sender === 'ai' ? '4px' : '0'}
                                    borderLeftColor="purple.500"
                                  >
                                    {msg.message && (
                                      <Text mb={2}>{msg.message}</Text>
                                    )}
                                    {msg.response && (
                                      <Text>{msg.response}</Text>
                                    )}
                                    
                                    {/* Timeline Suggestions */}
                                    {msg.sender === 'ai' && msg.timelineSuggestions && msg.timelineSuggestions.length > 0 && (
                                      <Box mt={3} p={2} borderRadius="md" bg="gray.100" _dark={{ bg: 'gray.800' }}>
                                        <Text fontSize="sm" fontWeight="bold" mb={2}>
                                          Relevant Timestamps:
                                        </Text>
                                        <Flex flexWrap="wrap" gap={2}>
                                          {msg.timelineSuggestions.map((suggestion, idx) => (
                                            <Badge 
                                              key={`${msg.id}-suggestion-${idx}`}
                                              colorScheme="purple" 
                                              variant="outline"
                                              px={2} 
                                              py={1}
                                              cursor="pointer"
                                              onClick={() => handleTimelineClick(suggestion.timestamp)}
                                            >
                                              {suggestion.timestamp} - {suggestion.text.length > 30 ? `${suggestion.text.substring(0, 30)}...` : suggestion.text}
                                            </Badge>
                                          ))}
                                        </Flex>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                              </VStack>
                            )}
                          </Box>
                          
                          <form onSubmit={handleChatSubmit}>
                            <Flex gap={2}>
                              <Input 
                                placeholder="Ask a question..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                flex={1}
                                isDisabled={chatLoading}
                              />
                              <CustomButton 
                                type="submit" 
                                colorScheme="purple"
                                isLoading={chatLoading}
                                loadingText="Thinking..."
                                isDisabled={!chatInput.trim()}
                              >
                                Send
                              </CustomButton>
                            </Flex>
                          </form>
                          
                          {auth.user?.role !== 'pro' && (
                            <Box mt={2} p={2} borderRadius="md" bg="yellow.50" _dark={{ bg: 'yellow.900' }}>
                              <Text fontSize="sm" color="yellow.800" _dark={{ color: 'yellow.200' }}>
                                You have reached the free limit. <ChakraLink color="purple.500" href="/pricing">Upgrade to Pro</ChakraLink>
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>
              </Flex>
              
              {/* Related Videos - Pro Feature */}
              {auth.user?.role === 'pro' && (
                <Box mt={10}>
                  <Heading size="md" mb={4}>Related Videos</Heading>
                  <Text color="gray.500" mb={4}>Discover more videos related to this topic.</Text>
                  
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    {[1, 2, 3].map((i) => (
                      <Card key={i} variant="outline">
                        <CardBody>
                          <Image
                            src={`https://via.placeholder.com/320x180?text=Related+Video+${i}`}
                            alt={`Related Video ${i}`}
                            borderRadius="md"
                            mb={3}
                          />
                          <Heading size="sm" mb={2} noOfLines={2}>
                            Related Video {i}
                          </Heading>
                          <HStack>
                            <CustomButton size="sm" leftIcon={<FaPlus />} colorScheme="purple" variant="outline" w="full">
                              Analyze
                            </CustomButton>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              )}
            </Box>
          )}
        </VStack>
      </Container>
    </>
  );
}
