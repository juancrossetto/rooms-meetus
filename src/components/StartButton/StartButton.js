import React from 'react';
import './StartButton.css';
import { Button, useColorModeValue } from '@chakra-ui/react';
/**
 * Props:
 * - disabled: boolean
 * - onClick: () => ()
 */
export default function StartButton({ disabled, onClick }) {
  return (
    <Button
      w={'full'}
      disabled={disabled}
      onClick={onClick}
      fontFamily={'heading'}
      bg={'#5985eb'}
      color={useColorModeValue('gray.800', 'white')}
      _hover={{ bg: 'gray.300' }}
    >
      Unirme
    </Button>
  );
}
