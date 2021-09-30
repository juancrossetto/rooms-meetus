import React, { useEffect, useState, useCallback } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Container,
  HStack,
} from '@chakra-ui/react';
import Call from '../Call/Call';
import StartButton from '../StartButton/StartButton';
import api from '../../api';
import './App.css';
import Tray from '../Tray/Tray';
import CallObjectContext from '../../CallObjectContext';
import { roomUrlFromPageUrl, pageUrlFromRoomUrl } from '../../urlUtils';
import DailyIframe from '@daily-co/daily-js';
import { logDailyEvent } from '../../logUtils';

const STATE_IDLE = 'STATE_IDLE';
const STATE_CREATING = 'STATE_CREATING';
const STATE_JOINING = 'STATE_JOINING';
const STATE_JOINED = 'STATE_JOINED';
const STATE_LEAVING = 'STATE_LEAVING';
const STATE_ERROR = 'STATE_ERROR';

export default function App() {
  const [appState, setAppState] = useState(STATE_IDLE);
  const [roomUrl, setRoomUrl] = useState(null);
  const [callObject, setCallObject] = useState(null);

  /**
   * Creates a new call room.
   */
  const createCall = useCallback((roomID) => {
    setAppState(STATE_CREATING);
    return api
      .createRoom(roomID)
      .then((room) => room.url)
      .catch((error) => {
        console.log('Error creating room', error);
        setRoomUrl(null);
        setAppState(STATE_IDLE);
      });
  }, []);

  /**
   * Starts joining an existing call.
   *
   * NOTE: In this demo we show how to completely clean up a call with destroy(),
   * which requires creating a new call object before you can join() again.
   * This isn't strictly necessary, but is good practice when you know you'll
   * be done with the call object for a while and you're no longer listening to its
   * events.
   */
  const startJoiningCall = useCallback((url) => {
    const newCallObject = DailyIframe.createCallObject();
    setRoomUrl(url);
    setCallObject(newCallObject);
    setAppState(STATE_JOINING);
    newCallObject.join({ url });
  }, []);

  /**
   * Starts leaving the current call.
   */
  const startLeavingCall = useCallback(() => {
    if (!callObject) return;
    // If we're in the error state, we've already "left", so just clean up
    if (appState === STATE_ERROR) {
      callObject.destroy().then(() => {
        setRoomUrl(null);
        setCallObject(null);
        setAppState(STATE_IDLE);
      });
    } else {
      setAppState(STATE_LEAVING);
      callObject.leave();
    }
  }, [callObject, appState]);

  /**
   * If a room's already specified in the page's URL when the component mounts,
   * join the room.
   */
  useEffect(() => {
    const url = roomUrlFromPageUrl();
    url && startJoiningCall(url);
  }, [startJoiningCall]);

  /**
   * Update the page's URL to reflect the active call when roomUrl changes.
   *
   * This demo uses replaceState rather than pushState in order to avoid a bit
   * of state-management complexity. See the comments around enableCallButtons
   * and enableStartButton for more information.
   */
  useEffect(() => {
    const pageUrl = pageUrlFromRoomUrl(roomUrl);
    if (pageUrl === window.location.href) return;
    window.history.replaceState(null, null, pageUrl);
  }, [roomUrl]);

  /**
   * Uncomment to attach call object to window for debugging purposes.
   */
  // useEffect(() => {
  //   window.callObject = callObject;
  // }, [callObject]);

  /**
   * Update app state based on reported meeting state changes.
   *
   * NOTE: Here we're showing how to completely clean up a call with destroy().
   * This isn't strictly necessary between join()s, but is good practice when
   * you know you'll be done with the call object for a while and you're no
   * longer listening to its events.
   */
  useEffect(() => {
    if (!callObject) return;

    const events = ['joined-meeting', 'left-meeting', 'error'];

    function handleNewMeetingState(event) {
      event && logDailyEvent(event);
      switch (callObject.meetingState()) {
        case 'joined-meeting':
          setAppState(STATE_JOINED);
          break;
        case 'left-meeting':
          callObject.destroy().then(() => {
            setRoomUrl(null);
            setCallObject(null);
            setAppState(STATE_IDLE);
          });
          break;
        case 'error':
          setAppState(STATE_ERROR);
          break;
        default:
          break;
      }
    }

    // Use initial state
    handleNewMeetingState();

    // Listen for changes in state
    for (const event of events) {
      callObject.on(event, handleNewMeetingState);
    }

    // Stop listening for changes in state
    return function cleanup() {
      for (const event of events) {
        callObject.off(event, handleNewMeetingState);
      }
    };
  }, [callObject]);

  /**
   * Listen for app messages from other call participants.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    function handleAppMessage(event) {
      if (event) {
        logDailyEvent(event);
        console.log(`received app message from ${event.fromId}: `, event.data);
      }
    }

    callObject.on('app-message', handleAppMessage);

    return function cleanup() {
      callObject.off('app-message', handleAppMessage);
    };
  }, [callObject]);

  /**
   * Show the call UI if we're either joining, already joined, or are showing
   * an error.
   */
  const showCall = [STATE_JOINING, STATE_JOINED, STATE_ERROR].includes(
    appState
  );

  /**
   * Only enable the call buttons (camera toggle, leave call, etc.) if we're joined
   * or if we've errored out.
   *
   * !!!
   * IMPORTANT: calling callObject.destroy() *before* we get the "joined-meeting"
   * can result in unexpected behavior. Disabling the leave call button
   * until then avoids this scenario.
   * !!!
   */
  const enableCallButtons = [STATE_JOINED, STATE_ERROR].includes(appState);

  /**
   * Only enable the start button if we're in an idle state (i.e. not creating,
   * joining, etc.).
   *
   * !!!
   * IMPORTANT: only one call object is meant to be used at a time. Creating a
   * new call object with DailyIframe.createCallObject() *before* your previous
   * callObject.destroy() completely finishes can result in unexpected behavior.
   * Disabling the start button until then avoids that scenario.
   * !!!
   */
  const enableStartButton = appState === STATE_IDLE;

  const rooms = [
    {
      id: '200467',
      code: 'WcQW4eHbRKJf9PsyAH1c',
      name: 'Interes general',
      online: 2,
      description:
        'Una sala para poder charlar y divertirse hablando de cualquier tema',
    },
    {
      id: '200468',
      code: 'WcQW4eHbRKJf9PsyAH1c',
      name: 'Viajes',
      online: 3,
      description:
        'Una sala para poder conocer de experiencias de viajes, lugares y mucho mas.',
    },
    {
      id: '200469',
      code: 'rrlXOpH1KlwNLO6GtBVp',
      name: 'Tecnología',
      online: 4,
      description:
        'Una sala para poder debatir sobre los últimos avances en la informática.',
    },
  ];

  return (
    <ChakraProvider>
      <Box bg="transparent">
        <Container
          maxW="8xl"
          padding={0}
          h={'100vh'}
          // display="flex"
          // justifyContent="center"
          // alignItems="center"
        >
          {/* <h1 className="title">MeetUs Rooms</h1> */}
          {showCall ? (
            // NOTE: for an app this size, it's not obvious that using a Context
            // is the best choice. But for larger apps with deeply-nested components
            // that want to access call object state and bind event listeners to the
            // call object, this can be a helpful pattern.
            <CallObjectContext.Provider value={callObject}>
              <Call roomUrl={roomUrl} />
              <Tray
                disabled={!enableCallButtons}
                onClickLeaveCall={startLeavingCall}
              />
            </CallObjectContext.Provider>
          ) : (
            <>
              {/* <Container maxW="6xl"> */}
              <Flex
                display="flex"
                flexDirection={'row'}
                justifyContent="center"
                alignItems="center"
                flexWrap="wrap"
                h={'100vh'}
              >
                {rooms.map((room) => (
                  <Box
                    key={room.id}
                    border="2px solid #5985eb"
                    w="20rem"
                    mx={4}
                    mt={4}
                    height="23rem"
                    position="relative"
                    borderRadius={8}
                  >
                    <Stack
                      id="header"
                      justifyContent="flex-start"
                      border="2px solid transparent"
                      borderBottomColor="#5985eb"
                      p={3}
                    >
                      <Text>
                        Id Sala: <strong>{room.id}</strong>
                      </Text>
                      <Heading color="#5985eb">{room.name}</Heading>
                    </Stack>
                    <Stack id="footer" p={3}>
                      <Text>Descripción</Text>
                      <Text fontSize="14px">{room.description}</Text>
                      <HStack
                        justifyContent="flex-start"
                        alignItems="center"
                        mt={'30px!important'}
                      >
                        <Box
                          w={4}
                          h={4}
                          bg={'green.300'}
                          border="2px solid white"
                          rounded="full"
                          left="0"
                        />
                        <Text
                          pos={'relative'}
                          fontSize="14px"
                          ml="10px!important"
                        >
                          {room.online} en línea
                        </Text>
                      </HStack>

                      <Box
                        position="absolute"
                        bottom="10px"
                        width="92%"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <StartButton
                          disabled={!enableStartButton}
                          onClick={() => {
                            createCall(room.code).then((url) =>
                              startJoiningCall(url)
                            );
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Flex>
              {/* </Container> */}
              {/* <div className="button-container">
              {roomsID.map((roomID, index) => (
                <StartButton
                  key={index}
                  disabled={!enableStartButton}
                  onClick={() => {
                    createCall(roomID).then((url) => startJoiningCall(url));
                  }}
                  number={index + 1}
                />
              ))}
            </div> */}
            </>
          )}
        </Container>
      </Box>
    </ChakraProvider>
  );
}
