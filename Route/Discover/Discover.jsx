import { MainWrapper } from "../../Layout/MainWrapper";
import { DiscoverCard } from "../../Component/Discover/DiscoverCard";
import { Dimensions, ScrollView, View } from "react-native";
import { Spacer } from "../../Component/Global/Spacer";
import { Heading } from "../../Component/Global/Heading";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { BundleEachLanguage } from "../../Component/Discover/BundleEachLanguage";
import { BundleEachMomentanGenres } from "../../Component/Discover/BundleEachMomentanGenres";
import { RouteHeading } from "../../Component/Home/RouteHeading";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { TrendingUp, BarChart3, Music, Headphones, Mic, Sparkles } from "lucide-react-native";

export const Discover = () => {
  const width = Dimensions.get("window").width;
  const navigation = useNavigation();

  // Clear any nested navigation params when Discover screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Discover screen focused - ensuring clean navigation state');

      // Get the current navigation state
      const state = navigation.getState();

      // Check if we're in a nested stack with params that might cause issues
      if (state.routes && state.routes.length > 0) {
        const currentRoute = state.routes[state.index];

        // If the current route has params that would redirect to Playlist, clear them
        if (currentRoute.params &&
          (currentRoute.params.screen === 'Playlist' ||
            (currentRoute.params.params && currentRoute.params.params.screen === 'Playlist'))) {
          console.log('Detected potentially problematic params - cleaning navigation state');

          // Reset the navigation state to just the Discover screen
          navigation.setParams(null);
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <MainWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <RouteHeading bottomText={"Discover music"} showSearch={true} />
        <View style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 12,
        }}>
          <DiscoverCard text={"Trending Now"} icon={TrendingUp} width={width * 0.46} navigate={"trending"} />
          <DiscoverCard text={"Most Searched"} icon={BarChart3} width={width * 0.46} navigate={"most searched"} />
        </View>
        <Spacer />
        <View style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 12,
        }}>
          <DiscoverCard text={"Pop Hits"} icon={Music} width={width * 0.46} navigate={"pop"} />
          <DiscoverCard text={"Lofi Beats"} icon={Headphones} width={width * 0.46} navigate={"lofi"} />
        </View>
        <Spacer />
        <View style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 12,
        }}>
          <DiscoverCard text={"Podcasts"} icon={Mic} width={width * 0.46} navigate={"podcasts"} />
          <DiscoverCard text={"New Release"} icon={Sparkles} width={width * 0.46} navigate={"new release"} />
        </View>
        <PaddingConatiner>
          <Heading text={"Languages"} />
          <ScrollView showsHorizontalScrollIndicator={false} horizontal={true} contentContainerStyle={{ gap: 10 }}>
            <BundleEachLanguage languages={["English", "Hindi"]} />
            <BundleEachLanguage languages={["Punjabi", "Tamil"]} />
            <BundleEachLanguage languages={["Telugu", "Marathi"]} />
            <BundleEachLanguage languages={["Gujarati", "Bengali"]} />
            <BundleEachLanguage languages={["Kannada", "Bhojpuri"]} />
            <BundleEachLanguage languages={["Malayalam", "Urdu"]} />
            <BundleEachLanguage languages={["Odia", "Assamese"]} />
          </ScrollView>
          <Heading text={"Moments"} />
          <ScrollView showsHorizontalScrollIndicator={false} horizontal={true} contentContainerStyle={{ gap: 10 }}>
            <BundleEachMomentanGenres list={["Workout", "Focus"]} color={["rgb(220,123,123)", "rgb(137,87,65)"]} />
            <BundleEachMomentanGenres list={["Chill", "Party"]} color={["rgb(78,159,188)", "rgb(233,125,241)"]} />
            <BundleEachMomentanGenres list={["Long Drive", "Sleep"]} color={["rgb(208,186,99)", "rgb(88,140,208)"]} />
            <BundleEachMomentanGenres list={["Late Night", "Study"]} color={["rgb(143,172,99)", "rgb(145,94,186)"]} />
          </ScrollView>
          <Heading text={"Genres"} />
          <ScrollView showsHorizontalScrollIndicator={false} horizontal={true} contentContainerStyle={{ gap: 10 }}>
            <BundleEachMomentanGenres list={["Hip Hop", "Jazz"]} color={["rgb(227,148,124)", "rgb(110,236,192)"]} />
            <BundleEachMomentanGenres list={["Retro", "Classical"]} color={["rgb(123,234,132)", "rgb(246,208,82)"]} />
            <BundleEachMomentanGenres list={["K-Pop", "Lofi"]} color={["rgb(178,109,234)", "rgb(109,145,223)"]} />
            <BundleEachMomentanGenres list={["Romance", "Sad"]} color={["rgb(236,144,199)", "rgb(199,229,148)"]} />
          </ScrollView>
        </PaddingConatiner>
      </ScrollView>
    </MainWrapper>
  );
};
