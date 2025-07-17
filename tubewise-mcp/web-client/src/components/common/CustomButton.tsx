import React from 'react';
import { Button as ChakraButton, ButtonProps } from '@chakra-ui/react';

// Custom Button component that filters out fdprocessedid attribute
const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  // Filter out fdprocessedid from props
  const { ...filteredProps } = props;
  
  // Remove fdprocessedid from DOM props
  const handleRef = (element: HTMLButtonElement | null) => {
    if (element) {
      // Remove the attribute if it exists
      if (element.hasAttribute('fdprocessedid')) {
        element.removeAttribute('fdprocessedid');
      }
      
      // Forward the ref if provided
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }
  };
  
  return <ChakraButton ref={handleRef} {...filteredProps} />;
});

CustomButton.displayName = 'CustomButton';

export default CustomButton;
