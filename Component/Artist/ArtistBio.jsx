import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';
import { PlainText } from '../Global/PlainText';
import {
  processBioData,
  shouldTruncateText,
  safeString,
} from '../../Utils/ArtistUtils';

/**
 * BioSection component - renders individual bio section with read more/less functionality
 * @param {object} props - Component props
 * @param {object} props.section - Bio section object
 * @param {number} props.index - Section index
 * @param {boolean} props.isExpanded - Whether section is expanded
 * @param {function} props.onToggle - Function to toggle section expansion
 * @returns {JSX.Element} - BioSection component
 */
const BioSection = ({ section, index, isExpanded, onToggle }) => {
  const theme = useTheme();

  // Ensure section has valid text and title properties
  const sectionTitle = safeString(section.title, 'Biography');
  const sectionText = safeString(section.text);

  // Handle Top 10 Songs list differently
  if (sectionTitle === 'Top 10 Songs') {
    const songLines = sectionText
      .split('\r\n')
      .filter((line) => line && line.trim());

    return (
      <View style={{ marginBottom: 20 }}>
        <Heading
          text={sectionTitle}
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        />
        {songLines.map((song, songIndex) => {
          const songText = safeString(song).trim();
          if (!songText) {
            return <View key={songIndex} />;
          }

          return (
            <PlainText
              key={songIndex}
              text={songText}
              style={{
                color: theme.colors.text,
                opacity: 0.8,
                lineHeight: 22,
                fontSize: 14,
                marginBottom: 4,
              }}
            />
          );
        })}
      </View>
    );
  }

  // Handle regular text sections
  const shouldTruncate = shouldTruncateText(sectionText);

  return (
    <View style={{ marginBottom: 20 }}>
      <Heading
        text={sectionTitle}
        style={{
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 10,
        }}
      />
      <PlainText
        text={sectionText}
        numberOfLine={isExpanded ? null : shouldTruncate ? 2 : null}
        style={{
          color: theme.colors.text,
          opacity: 0.8,
          lineHeight: 22,
          fontSize: 14,
        }}
      />
      {shouldTruncate && (
        <Pressable onPress={onToggle} style={{ marginTop: 10 }}>
          <SmallText
            text={isExpanded ? 'Show Less' : 'Read More'}
            style={{ color: theme.colors.primary, fontWeight: 'bold' }}
          />
        </Pressable>
      )}
    </View>
  );
};

/**
 * ArtistBio component - displays artist biography with expandable sections
 * @param {object} props - Component props
 * @param {any} props.bioData - Bio data in various formats
 * @returns {JSX.Element} - ArtistBio component
 */
const ArtistBio = ({ bioData }) => {
  const theme = useTheme();
  const [showFullBio, setShowFullBio] = useState({});

  const toggleSection = (index) => {
    setShowFullBio((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  try {
    const bioArray = processBioData(bioData);

    if (bioArray.length === 0) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <SmallText
            text="No biography available"
            style={{ color: theme.colors.text, opacity: 0.6 }}
          />
        </View>
      );
    }

    return (
      <View style={{ padding: 20 }}>
        {bioArray.map((section, index) => {
          try {
            // Safety check for section data
            if (
              !section ||
              (typeof section !== 'object' && typeof section !== 'string')
            ) {
              return <View key={index} />;
            }

            // If section is a string, convert to object format
            if (typeof section === 'string') {
              section = { title: 'Biography', text: section };
            }

            return (
              <BioSection
                key={index}
                section={section}
                index={index}
                isExpanded={showFullBio[index] || false}
                onToggle={() => toggleSection(index)}
              />
            );
          } catch (sectionError) {
            console.error('Error rendering bio section:', sectionError);
            return <View key={index} />;
          }
        })}
      </View>
    );
  } catch (error) {
    console.error('Error rendering bio sections:', error);
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <SmallText
          text="Error loading biography"
          style={{ color: theme.colors.text, opacity: 0.6 }}
        />
      </View>
    );
  }
};

export default ArtistBio;
