import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Höhe der eingeblendeten Tastatur (0, wenn sie zu ist).
 * Wird als zusätzlicher unterer Abstand in Listen genutzt, damit sich der Inhalt auch bei offener
 * Tastatur bis zum Ende scrollen lässt – im Sheet reichen die automatischen Einsätze von iOS nicht.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // „will“-Ereignisse kommen auf iOS früher und wirken dadurch flüssiger.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
