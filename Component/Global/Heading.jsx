import { Dimensions, StyleSheet } from "react-native";
import { Text } from 'react-native-paper';
import { Spacer } from "./Spacer";
import { useEffect, useState } from "react";
import { GetFontSizeValue } from "../../LocalStorage/AppSettings";

export const Heading = ({text, style, nospace}) => {
  const width = Dimensions.get('window').width
  const [Size, setSize] = useState(width * 0.055);
  async function getFont(){
    const data = await GetFontSizeValue()
    if (data === "Medium"){
      setSize(width * 0.055)
    } else if (data === "Small"){
      setSize(width * 0.045)
    } else {
      setSize(width * 0.065)
    }
  }

  useEffect(() => {
    getFont()
  }, []);
  return (
   <>
     {!nospace && <Spacer/>}
     <Text
       variant="headlineMedium"
       numberOfLines={2}
       style={{
         fontWeight: 900,
         fontSize: Size,
         fontFamily: 'roboto',
         ...StyleSheet.flatten(style),
       }}
     >
       {text || ''}
     </Text>
     {!nospace && <Spacer/>}
   </>
  );
};
