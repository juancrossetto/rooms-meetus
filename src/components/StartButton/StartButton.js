import React from 'react';
import './StartButton.css';

/**
 * Props:
 * - disabled: boolean
 * - onClick: () => ()
 */
export default function StartButton({ disabled, onClick, number }) {
  return (
    <button className="start-button" disabled={disabled} onClick={onClick}>
      Ingresar Sala {number}
    </button>
  );
}
