import { EachPlaylistCard } from "../Global/EachPlaylistCard";
import { View } from "react-native";

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const RenderTopCharts = ({playlist}) => {
  const data = []
  for (let i = 0; i < playlist.length; i = i + 2){
    if (i === playlist.length - 1 && playlist.length % 2 !== 0){
      data.push([playlist[i]])
    }
    else {
      data.push([playlist[i],playlist[i + 1]])
    }
  }
  return (
    <View style={{flexDirection: 'row', marginHorizontal: -6}}>
      {data.map((item, index) => (
        <View key={index} style={{marginRight: 6, flex: 1, paddingHorizontal: 1}}>
          {item.map((e, i) => (
            <EachPlaylistCard 
              image={e.image[2].link} 
              name={truncateText(e.title, 30)} 
              follower={truncateText(e.subtitle, 30)} 
              key={e.id} 
              id={e.id}
              MainContainerStyle={{
                marginVertical: 2,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};
