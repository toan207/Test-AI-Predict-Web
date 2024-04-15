import React, { useEffect, useRef } from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { Howl } from 'howler';
import './App.css';
import soundURL from './assets/beep-warning-6387.mp3';

var sound = new Howl({
  src: [soundURL],
});

const SLEEPY = 'SLEEPY';
const NOT_SLEEPY = 'NOT_SLEEPY';
const TRUSTED_VALUE = 0.8;
const TRAINING_TIMES = 50;

function App() {
  const video = useRef();
  const canPlayVideo = useRef(true);
  const classifier = useRef();
  const mobilenetModel = useRef();

  const init = async () => {
    console.log('initing...')
    await setupCamera();

    mobilenetModel.current = await mobilenet.load();
    classifier.current = knnClassifier.create();

    console.log('setup done!');
  }

  const setupCamera = () => {
    return new Promise((res, rej) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', res);
          },
          error => rej(error)
        )
      } else {
        rej();
      }
    })
  }

  const train = async label => {
    for (let i = 0; i < TRAINING_TIMES; ++i) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES)}%`);

      await training(label);
    }
  }

  const training = label => {
    return new Promise(async res => {
      const embedding = mobilenetModel.current.infer(
        video.current,
        true
      );

      classifier.current.addExample(embedding, label);
      await sleep(100);
      res();
    })
  }

  const run = async () => {
    const embedding = mobilenetModel.current.infer(
      video.current,
      true
    );

    const result = await classifier.current.predictClass(embedding);

    if (result.label === SLEEPY && result.confidences > TRUSTED_VALUE) {
      if (canPlayVideo.current == true) {
        sound.play();
        canPlayVideo.current = false;
      }
    }

    console.log('Label: ', result.label);
    console.log('Confidences: ', result.confidences);
  }

  const sleep = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms));
  }

  useEffect(() => {
    init();

    sound.on('end', async () => {
      await sleep(1000);
      canPlayVideo.current = true;
    })

    return () => {

    }
  }, []);
  return (
    <div className="main">
      <video
        ref={video}
        className='video'
        autoPlay
      />

      <div className='control'>
        <button className='btn' onClick={() => train(NOT_SLEEPY)}> Train 1</button>
        <button className='btn' onClick={() => train(SLEEPY)}> Train 2</button>
        <button className='btn' onClick={() => { }}> Run</button>
      </div>
    </div>
  );
}

export default App;
