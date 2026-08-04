import { View, ScrollView } from 'react-native';
import EachTabs from './EachTabs';
import { memo } from 'react';

function Tabs({ tabs, state, setState }) {
  return (
    <View style={{ paddingHorizontal: 2 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: 0,
        }}
      >
        {tabs.map((e, i) => {
          if (state === i) {
            return (
              <EachTabs
                index={i}
                item={e}
                isActive={true}
                setActive={setState}
                key={i}
              />
            );
          } else {
            return (
              <EachTabs
                index={i}
                item={e}
                isActive={false}
                setActive={setState}
                key={i}
              />
            );
          }
        })}
      </ScrollView>
    </View>
  );
}
export default memo(Tabs);
