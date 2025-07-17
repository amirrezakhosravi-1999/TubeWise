import React from 'react';
import { Box, Text, Link, useColorModeValue } from '@chakra-ui/react';

interface TimestampContentProps {
  content: string;
  videoId: string;
}

/**
 * A component that renders text content with clickable timestamps
 * Timestamps are detected in formats like (00:00), (0:00), (00:00:00)
 */
const TimestampContent: React.FC<TimestampContentProps> = ({ content, videoId }) => {
  const bgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  
  // Regular expression to detect timestamps in various formats
  // Matches (00:00), (0:00), (00:00:00), 00:00, 0:00, 00:00:00
  const timestampRegex = /\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?/g;
  
  // Function to convert timestamp to seconds for YouTube URL
  const timestampToSeconds = (timestamp: string) => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
      // Format: MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // Format: HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };
  
  // Replace timestamps with clickable links
  const renderContent = () => {
    if (!content) return null;
    
    // Split by timestamp matches
    const segments = content.split(timestampRegex);
    const matches = content.match(timestampRegex) || [];
    
    return segments.map((text, index) => {
      // For each segment, render the text
      // If there's a timestamp after this segment, render it as a link
      return (
        <React.Fragment key={index}>
          {text}
          {index < matches.length && (
            <Link 
              href={`https://www.youtube.com/watch?v=${videoId}&t=${timestampToSeconds(matches[index].replace(/[()]/g, ''))}`}
              color="blue.500"
              fontWeight="bold"
              target="_blank"
              rel="noopener noreferrer"
              _hover={{ textDecoration: 'underline' }}
            >
              {matches[index]}
            </Link>
          )}
        </React.Fragment>
      );
    });
  };
  
  return (
    <Box 
      p={3} 
      borderRadius="md" 
      bg={bgColor} 
      fontSize="md"
      color={textColor}
      whiteSpace="pre-wrap"
      overflowY="auto"
      height="200px"
    >
      {renderContent()}
    </Box>
  );
};

export default TimestampContent;
