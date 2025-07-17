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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Textarea,
  Icon,
  IconButton,
  useClipboard,
  Badge,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { FaTwitter, FaLinkedin, FaRegFileAlt, FaArrowLeft, FaCopy, FaCheck, FaArrowRight, FaShare, FaExternalLinkAlt } from 'react-icons/fa';
import axios from 'axios';
import TimestampContent from '../components/TimestampContent';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Summary } from '../types';
import { useAuth } from '../contexts/AuthContext';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Generate() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { videoId } = router.query;
  const toast = useToast();
  const auth = useAuth();
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [generatedContents, setGeneratedContents] = useState<{
    twitter: string;
    linkedin: string;
    notion: string;
  }>({
    twitter: '',
    linkedin: '',
    notion: ''
  });
  
  // Content style options
  const [contentStyle, setContentStyle] = useState<{
    twitter: 'professional' | 'casual' | 'educational';
    linkedin: 'professional' | 'casual' | 'educational';
    notion: 'professional' | 'casual' | 'educational';
  }>({
    twitter: 'casual',
    linkedin: 'professional',
    notion: 'educational'
  });
  
  const { hasCopied: hasTwitterCopied, onCopy: onTwitterCopy } = useClipboard(generatedContents.twitter);
  const { hasCopied: hasLinkedinCopied, onCopy: onLinkedinCopy } = useClipboard(generatedContents.linkedin);
  const { hasCopied: hasNotionCopied, onCopy: onNotionCopy } = useClipboard(generatedContents.notion);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  useEffect(() => {
    if (!videoId) {
      // Redirect to home if no videoId
      router.push('/');
      return;
    }
    
    // Fetch summary
    fetchSummary();
  }, [videoId, router]);
  
  // Regenerate content when style changes
  useEffect(() => {
    // Only regenerate if summary exists and content for this platform was already generated once
    if (summary) {
      const hasContent = 
        (contentStyle.twitter === 'professional' && generatedContents.twitter) || 
        (contentStyle.linkedin === 'professional' && generatedContents.linkedin) || 
        (contentStyle.notion === 'professional' && generatedContents.notion);
      
      if (hasContent) {
        generateContent();
      }
    }
  }, [contentStyle]);
  
  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/summarize/${videoId}`);
      const data = response.data;
      
      // Create a proper Summary object
      const summaryObj: Summary = {
        videoId: videoId as string,
        title: data.title || 'Unknown title',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: data.duration || '0:00',
        summary: data.summary || '',
        keyPoints: data.keyPoints || []
      };
      
      setSummary(summaryObj);
      setLoading(false);
      
      // Generate content automatically
      generateContent();
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast({
        title: t('errors.failedSummary'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };
  
  const generateContent = async () => {
    if (!summary) return;
    
    setGeneratingContent(true);
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Generate content for each platform with the selected style
      const twitterResponse = await axios.post(`${apiUrl}/api/generate-content`, {
        videoId: summary.videoId,
        contentType: 'twitter',
        style: contentStyle.twitter,
        excludePromotions: true // Don't include like/subscribe sections
      });
      
      const linkedinResponse = await axios.post(`${apiUrl}/api/generate-content`, {
        videoId: summary.videoId,
        contentType: 'linkedin',
        style: contentStyle.linkedin,
        excludePromotions: true // Don't include like/subscribe sections
      });
      
      const notionResponse = await axios.post(`${apiUrl}/api/generate-content`, {
        videoId: summary.videoId,
        contentType: 'notion',
        style: contentStyle.notion,
        excludePromotions: true // Don't include like/subscribe sections
      });
      
      setGeneratedContents({
        twitter: twitterResponse.data.content,
        linkedin: linkedinResponse.data.content,
        notion: notionResponse.data.content
      });
      
      setGeneratingContent(false);
      
      toast({
        title: t('success.contentGenerated'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: t('errors.failedContentGeneration'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setGeneratingContent(false);
    }
  };
  
  const handleCopyContent = (type: 'twitter' | 'linkedin' | 'notion') => {
    switch (type) {
      case 'twitter':
        onTwitterCopy();
        break;
      case 'linkedin':
        onLinkedinCopy();
        break;
      case 'notion':
        onNotionCopy();
        break;
    }
    
    toast({
      title: t('success.contentCopied'),
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };
  
  // Modal state for sharing to platforms
  const { isOpen: isShareModalOpen, onOpen: onShareModalOpen, onClose: onShareModalClose } = useDisclosure();
  const [sharingPlatform, setSharingPlatform] = useState<'twitter' | 'linkedin' | 'notion'>('twitter');
  const [sharingUrl, setSharingUrl] = useState('');
  
  // Function to handle direct sharing to platforms
  const handleShareContent = (type: 'twitter' | 'linkedin' | 'notion') => {
    setSharingPlatform(type);
    
    // Create sharing URLs based on platform
    if (type === 'twitter') {
      // Twitter sharing URL (now X)
      const tweetText = encodeURIComponent(generatedContents.twitter.split('\n\n---\n\n')[0]); // Just the first tweet
      const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
      setSharingUrl(tweetUrl);
    } else if (type === 'linkedin') {
      // LinkedIn sharing URL
      const text = encodeURIComponent(generatedContents.linkedin);
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${summary?.videoId}`)}&summary=${text}`;
      setSharingUrl(linkedinUrl);
    } else if (type === 'notion') {
      // For Notion, we'll show instructions since direct sharing isn't as straightforward
      setSharingUrl('');
    }
    
    onShareModalOpen();
  };
  
  // Function to open the sharing URL in a new tab
  const openSharingUrl = () => {
    if (sharingUrl) {
      window.open(sharingUrl, '_blank');
    }
    onShareModalClose();
  };
  
  return (
    <>
      <Head>
        <title>Generate Content | TubeWise</title>
        <meta name="description" content="Generate different types of content from your video summary" />
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
                  Generate Content
                </Text>
              </Box>
              
              <Link href="/" passHref>
                <Button leftIcon={<FaArrowLeft />} variant="outline">
                  Back
                </Button>
              </Link>
            </Flex>
            
            {loading ? (
              <Box textAlign="center" py={20}>
                <Spinner size="xl" color="purple.500" />
                <Text mt={4} fontSize="xl">Loading content...</Text>
              </Box>
            ) : summary ? (
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
                  <Heading size="md" mb={4}>{summary.title}</Heading>
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                    <Box width={{ base: '100%', md: '200px' }} flexShrink={0}>
                      <Box 
                        bgImage={`url(${summary.thumbnailUrl})`}
                        bgSize="cover"
                        bgPosition="center"
                        borderRadius="md"
                        height="120px"
                      />
                    </Box>
                    <Box flex={1}>
                      <Text noOfLines={3} fontSize="sm" color="gray.500">
                        {summary.summary}
                      </Text>
                      <HStack mt={4} spacing={4}>
                        <Link href={`/?videoId=${summary.videoId}`} passHref>
                          <Button size="sm" colorScheme="purple" variant="outline">
                            {t('action.viewSummary') || 'View Summary'}
                          </Button>
                        </Link>
                        <Link href={summary.url} passHref target="_blank" rel="noopener noreferrer">
                          <Button 
                            size="sm" 
                            colorScheme="red" 
                            variant="outline"
                            as="a"
                          >
                            {t('action.viewOnYoutube') || 'View on YouTube'}
                          </Button>
                        </Link>
                      </HStack>
                    </Box>
                  </Flex>
                </Box>
                
                <Box p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
                  <Heading size="md" mb={6}>Generated Content</Heading>
                  
                  {!generatedContents.twitter && !generatedContents.linkedin && !generatedContents.notion && !generatingContent ? (
                    <Box textAlign="center" py={10}>
                      <Button
                        onClick={generateContent}
                        colorScheme="purple"
                        size="lg"
                        isLoading={generatingContent}
                        loadingText={t('actions.generating') || 'Generating...'}
                      >
                        {t('actions.generateContent') || 'Generate Content'}
                      </Button>
                    </Box>
                  ) : generatingContent ? (
                    <Box textAlign="center" py={10}>
                      <Spinner size="xl" color="purple.500" />
                      <Text mt={4}>{t('actions.generating') || 'Generating content...'}</Text>
                    </Box>
                  ) : (
                    <Tabs colorScheme="purple" index={activeTab} onChange={setActiveTab}>
                      <TabList>
                        <Tab>Twitter</Tab>
                        <Tab>LinkedIn</Tab>
                        <Tab>Notion</Tab>
                      </TabList>
                      
                      <TabPanels>
                        {/* Twitter Tab */}
                        <TabPanel>
                          <VStack spacing={4} align="stretch">
                            <HStack spacing={4} mb={2}>
                              <Text fontWeight="bold">Style:</Text>
                              <Badge 
                                colorScheme={contentStyle.twitter === 'professional' ? 'blue' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, twitter: 'professional'})}
                              >
                                Professional
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.twitter === 'casual' ? 'green' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, twitter: 'casual'})}
                              >
                                Casual
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.twitter === 'educational' ? 'purple' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, twitter: 'educational'})}
                              >
                                Educational
                              </Badge>
                            </HStack>
                            <TimestampContent 
                              content={generatedContents.twitter} 
                              videoId={summary?.videoId || ''}
                            />
                            <HStack justifyContent="space-between">
                              <Button
                                leftIcon={<FaArrowRight />}
                                onClick={generateContent}
                                colorScheme="twitter"
                                variant="outline"
                                isDisabled={generatingContent}
                              >
                                {t('actions.regenerate') || 'Regenerate'}
                              </Button>
                              <HStack spacing={2}>
                                <Button
                                  rightIcon={hasTwitterCopied ? <FaCheck /> : <FaCopy />}
                                  onClick={() => handleCopyContent('twitter')}
                                  colorScheme="purple"
                                  size="md"
                                >
                                  {hasTwitterCopied ? t('actions.copied') || 'Copied' : t('actions.copy') || 'Copy'}
                                </Button>
                                <Tooltip label="Share to Twitter">
                                  <IconButton
                                    aria-label="Share to Twitter"
                                    icon={<FaShare />}
                                    colorScheme="twitter"
                                    onClick={() => handleShareContent('twitter')}
                                    size="md"
                                  />
                                </Tooltip>
                              </HStack>
                            </HStack>
                          </VStack>
                        </TabPanel>
                        
                        {/* LinkedIn Tab */}
                        <TabPanel>
                          <VStack spacing={4} align="stretch">
                            <HStack spacing={4} mb={2}>
                              <Text fontWeight="bold">Style:</Text>
                              <Badge 
                                colorScheme={contentStyle.linkedin === 'professional' ? 'blue' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, linkedin: 'professional'})}
                              >
                                Professional
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.linkedin === 'casual' ? 'green' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, linkedin: 'casual'})}
                              >
                                Casual
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.linkedin === 'educational' ? 'purple' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, linkedin: 'educational'})}
                              >
                                Educational
                              </Badge>
                            </HStack>
                            <TimestampContent 
                              content={generatedContents.linkedin} 
                              videoId={summary?.videoId || ''}
                            />
                            <HStack justifyContent="space-between">
                              <Button
                                leftIcon={<FaArrowRight />}
                                onClick={generateContent}
                                colorScheme="linkedin"
                                variant="outline"
                                isDisabled={generatingContent}
                              >
                                {t('actions.regenerate') || 'Regenerate'}
                              </Button>
                              <HStack spacing={2}>
                                <Button
                                  rightIcon={hasLinkedinCopied ? <FaCheck /> : <FaCopy />}
                                  onClick={() => handleCopyContent('linkedin')}
                                  colorScheme="purple"
                                  size="md"
                                >
                                  {hasLinkedinCopied ? t('actions.copied') || 'Copied' : t('actions.copy') || 'Copy'}
                                </Button>
                                <Tooltip label="Share to LinkedIn">
                                  <IconButton
                                    aria-label="Share to LinkedIn"
                                    icon={<FaShare />}
                                    colorScheme="linkedin"
                                    onClick={() => handleShareContent('linkedin')}
                                    size="md"
                                  />
                                </Tooltip>
                              </HStack>
                            </HStack>
                          </VStack>
                        </TabPanel>
                        
                        {/* Notion Tab */}
                        <TabPanel>
                          <VStack spacing={4} align="stretch">
                            <HStack spacing={4} mb={2}>
                              <Text fontWeight="bold">Style:</Text>
                              <Badge 
                                colorScheme={contentStyle.notion === 'professional' ? 'blue' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, notion: 'professional'})}
                              >
                                Professional
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.notion === 'casual' ? 'green' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, notion: 'casual'})}
                              >
                                Casual
                              </Badge>
                              <Badge 
                                colorScheme={contentStyle.notion === 'educational' ? 'purple' : 'gray'}
                                px={2} py={1} cursor="pointer"
                                onClick={() => setContentStyle({...contentStyle, notion: 'educational'})}
                              >
                                Educational
                              </Badge>
                            </HStack>
                            <TimestampContent 
                              content={generatedContents.notion} 
                              videoId={summary?.videoId || ''}
                            />
                            <HStack justifyContent="space-between">
                              <Button
                                leftIcon={<FaArrowRight />}
                                onClick={generateContent}
                                colorScheme="purple"
                                variant="outline"
                                isDisabled={generatingContent}
                              >
                                {t('actions.regenerate') || 'Regenerate'}
                              </Button>
                              <HStack spacing={2}>
                                <Button
                                  rightIcon={hasNotionCopied ? <FaCheck /> : <FaCopy />}
                                  onClick={() => handleCopyContent('notion')}
                                  colorScheme="purple"
                                  size="md"
                                >
                                  {hasNotionCopied ? t('actions.copied') || 'Copied' : t('actions.copy') || 'Copy'}
                                </Button>
                                <Tooltip label="Export to Notion">
                                  <IconButton
                                    aria-label="Export to Notion"
                                    icon={<FaShare />}
                                    colorScheme="gray"
                                    onClick={() => handleShareContent('notion')}
                                    size="md"
                                  />
                                </Tooltip>
                              </HStack>
                            </HStack>
                          </VStack>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  )}
                </Box>
                
                {auth.user?.role !== 'pro' && (
                  <Box p={4} bg="yellow.50" _dark={{ bg: 'yellow.900' }} borderRadius="md">
                    <Flex align="center" gap={4}>
                      <Icon as={FaTwitter} boxSize={6} color="yellow.500" />
                      <Box>
                        <Text fontWeight="bold">Limited Access</Text>
                        <Text fontSize="sm">Upgrade to Pro to unlock more features.</Text>
                      </Box>
                      <Button 
                        colorScheme="yellow" 
                        ml="auto"
                        onClick={() => router.push('/pricing')}
                      >
                        Upgrade to Pro
                      </Button>
                    </Flex>
                  </Box>
                )}
              </VStack>
            ) : (
              <Box textAlign="center" py={20}>
                <Icon as={FaRegFileAlt} boxSize={12} color="gray.400" />
                <Heading size="md" mt={4} color="gray.500">
                  No video selected
                </Heading>
                <Text mt={2} color="gray.500">
                  Please select a video to generate content.
                </Text>
                <Link href="/" passHref>
                  <Button mt={6} colorScheme="purple">
                    {t('action.viewSummary') || 'View Summary'}
                  </Button>
                </Link>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
      {/* Sharing Modal */}
      <Modal isOpen={isShareModalOpen} onClose={onShareModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {sharingPlatform === 'twitter' ? 'Share to Twitter' : 
             sharingPlatform === 'linkedin' ? 'Share to LinkedIn' : 
             'Export to Notion'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {sharingPlatform === 'notion' ? (
              <VStack spacing={4} align="start">
                <Text>To export this content to Notion:</Text>
                <Box p={3} bg="gray.50" borderRadius="md" width="100%">
                  <VStack align="start" spacing={2}>
                    <Text>1. Copy the content using the Copy button</Text>
                    <Text>2. Open Notion and create a new page</Text>
                    <Text>3. Paste the content into your Notion page</Text>
                    <Text>4. The markdown formatting will be preserved</Text>
                  </VStack>
                </Box>
                <Button leftIcon={<FaCopy />} onClick={() => handleCopyContent('notion')} colorScheme="purple" width="100%">
                  {t('actions.copyForNotion') || 'Copy Content for Notion'}
                </Button>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <Text>
                  {sharingPlatform === 'twitter' ? 
                    'Share this content as a tweet on Twitter' : 
                    'Share this content as a post on LinkedIn'}
                </Text>
                <Button 
                  leftIcon={<FaExternalLinkAlt />} 
                  colorScheme={sharingPlatform === 'twitter' ? 'twitter' : 'linkedin'}
                  onClick={openSharingUrl}
                  width="100%"
                >
                  Continue to {sharingPlatform === 'twitter' ? 'Twitter' : 'LinkedIn'}
                </Button>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onShareModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
