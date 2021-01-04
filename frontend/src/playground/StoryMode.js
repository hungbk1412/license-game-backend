import React, {useState, useEffect, useReducer} from 'react';
import lodash from 'lodash';
import Grid from '@material-ui/core/Grid';
import {makeStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import challengeGenerator from '../game_generator/Story';
import {licenseTypes, questionTypes} from '../Types';
import PracticeMode from './practice/PracticeMode';
import ChooseLicenseDialog from './dialog/ChooseLicenseDialog';
import {checkCompatible, postProgress} from '../Requests';
import Choice from './Choice';
import Slide from '@material-ui/core/Slide';
import {useParams} from 'react-router-dom';
import ConfirmSubmission from "./dialog/ConfirmSubmission";
import {story_description_image_container, story_talk_box, story_question, story_smith} from '../images';

const LAST_LEVEL = 6;
const SUCCESS_MESSAGE = 'Congratulation !!!';
const FAIL_MESSAGE = 'Please try again';
const ACTIONS = {
    TO_NEXT_LEVEL: 'to_next_level',
    PREPARE_OER_RESOURCES: 'prepare_oer_resources',
    PREPARE_CHOICES_FOR_LAST_LEVEL: 'prepare_choices_for_last_level'
};

const useStyles = makeStyles((theme) => ({
    root: {
      'position': 'relative'
    },
    context: {
        'backgroundImage': `url(${story_talk_box})`,
        'background-size': '100% 100%',
        [theme.breakpoints.up('sm')]: {
            'padding-top': '40px',
            'padding-left': '70px',
            'padding-right': '30px',
            'height': '180px'
        },
        [theme.breakpoints.up('xl')]: {
            'height': '150px'
        }
    },
    picture: {
        'position': 'relative',
        [theme.breakpoints.up('sm')]: {
            'height': '225px'
        },
        [theme.breakpoints.up('xl')]: {
            'height': '300px'
        }
    },
    image_container: {
        'position': 'absolute',
        'max-width': '100%',
        'max-height': '100%',
        [theme.breakpoints.up('sm')]: {
            'top': '25px',
            'left': '107px'
        },
        [theme.breakpoints.up('xl')]: {
            'top': '25px',
            'left': '107px'
        }
    },
    image: {
        'position': 'absolute',
        'max-width': '10%',
        'max-height': '10%'
    },
    question: {
        'z-index': '1',
        'backgroundImage': `url(${story_question})`,
        'background-size': '100% 100%',
        'color': '#BFB7AF',
        [theme.breakpoints.up('sm')]: {
            'margin-top': '20px',
            'padding-left': '40px',
            'padding-right': '40px',
            'height': '200px'
        },
        [theme.breakpoints.up('xl')]: {
            'height': '175px'
        }
    },
    submit_button: {
        [theme.breakpoints.up('sm')]: {
            'margin-top': '20px'
        },
        [theme.breakpoints.up('xl')]: {
            'margin-top': '20px'
        }
    },
    go_button: {
        'background-color': 'brown',
        [theme.breakpoints.up('sm')]: {
            'margin-top': '20px'
        },
        [theme.breakpoints.up('xl')]: {
            'margin-top': '20px'
        }
    },
    smith: {
        'z-index': '0',
        'position': 'absolute',
        [theme.breakpoints.up('sm')]: {
            'max-width': '45%',
            'top': '100px',
            'left': '500px'
        },
        [theme.breakpoints.up('xl')]: {
            'max-width': '25%',
            'margin-left': '270px',
            'margin-top': '120px',
        }
    }
}));

const challengeReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.TO_NEXT_LEVEL: {
            return action.payload.nextChallenge;
        }
        case ACTIONS.PREPARE_OER_RESOURCES: {
            let newChallenge = lodash.cloneDeep(state);
            state.require_result_of_levels.forEach(level => {
                newChallenge.oer_resources.push(action.payload.resultsOfLevels[level]);
            });
            return newChallenge;
        }
        case ACTIONS.PREPARE_CHOICES_FOR_LAST_LEVEL: {
            let newChallenge = lodash.cloneDeep(state);
            newChallenge.choices[state.correctAnswer].CC_license = action.payload.correctAnswer;
            newChallenge.choices[state.correctAnswer].display_text = action.payload.correctAnswer;
            let availableLicenses = Object.values(licenseTypes).filter(elem => elem !== action.payload.correctAnswer);
            newChallenge.choices = newChallenge.choices.map(license => {
                if (license.CC_license === null) {
                    let randomLicense = availableLicenses[Math.floor(Math.random() * availableLicenses.length)];
                    license.CC_license = randomLicense;
                    license.display_text = randomLicense;
                    availableLicenses = availableLicenses.filter(elem => elem !== randomLicense);
                    return license;
                } else {
                    return license;
                }
            });
            return newChallenge;
        }
        default:
            return state;
    }
};

function StoryMode(props) {
    const styles = useStyles();
    const changeToStoryBackground = props.change_to_story_background;
    const {level} = useParams();
    const [challenge, dispatchChallenge] = useReducer(challengeReducer, challengeGenerator(level));
    const [chosenLicenses, setChosenLicenses] = useState([]);
    const [practices, setPractices] = useState(challenge.practices);
    const nextChallenge = challengeGenerator(challenge.level + 1);
    const [isChooseLicenseDialogOpening, setIsChooseLicenseDialogOpening] = useState(false);
    const [confirmSubmissionDialog, setConfirmSubmissionDialog] = useState({
        is_opening: false,
        correctness: false,
        message: ''
    });
    const [finalLicense, setFinalLicense] = useState('');
    const [resultsOfLevels, setResultsOfLevels] = useState({});
    const [failTimes, setFailTimes] = useState(0);
    const [message, setMessage] = useState('');
    // Only used for questions requiring players to choose many answer (choices)
    const [choices, setChoices] = useState([
        {
            is_selected: false,
            color: 'none'
        },
        {
            is_selected: false,
            color: 'none'
        },
        {
            is_selected: false,
            color: 'none'
        },
        {
            is_selected: false,
            color: 'none'
        }
    ]);
    const [showUp, setShowUp] = useState({
        stable_content: true,
        unstable_content: true,
    });

    /*
        Open the dialog, in which players choose a license as their final answer
        @param [int] choiceNumbers
     */
    const openChooseLicenseDialog = (choiceNumbers) => {
        let newMessage = challenge.oer_resources[0];
        let newChosenLicenses = lodash.cloneDeep(chosenLicenses);
        choiceNumbers.forEach(choiceNumber => {
            newChosenLicenses.push(challenge.choices[choiceNumber].CC_license);
            newMessage += '; ' + challenge.choices[choiceNumber].CC_license
        });
        setChosenLicenses(newChosenLicenses);
        setMessage(newMessage);
        setIsChooseLicenseDialogOpening(true);
    };

    const selectFinalLicense = (e) => {
        setFinalLicense(e.target.value)
    };

    const getAllSelectedChoices = () => {
        let res = [];
        for (let i = 0; i < choices.length; i++) {
            if (choices[i].is_selected) {
                res.push(i);
            }
        }
        return res;
    };

    /*
        Unset the selected choices
        @params [int] choiceNumbers
     */
    const unselectSelectedChoices = (choiceNumbers) => {
        let newChoices = lodash.cloneDeep(choices);
        choiceNumbers.forEach(choiceNumber => {
            newChoices[choiceNumber].is_selected = false;
        });
        setChoices(newChoices);
    };

    const closeChooseLicenseDialog = () => {
        setIsChooseLicenseDialogOpening(false);
    };

    const closeConfirmSubmissionDialog = () => {
        setConfirmSubmissionDialog(prevState => {
            return {...prevState, is_opening: false}
        });
    };

    const clickOnSubmitButton = (e) => {
        e.preventDefault();
        checkCompatible(window.accessToken, challenge.combination_type, chosenLicenses.concat(challenge.oer_resources), finalLicense)
            .then(res => {
                // Player correctly answered
                if (res.result) {
                    setIsChooseLicenseDialogOpening(false);
                    setResultsOfLevels({
                        ...resultsOfLevels,
                        [challenge.level]: finalLicense
                    });
                    setFinalLicense('');
                    unselectSelectedChoices(getAllSelectedChoices());
                    setConfirmSubmissionDialog(prevState => {
                        return {...prevState, is_opening: true, correctness: true, message: SUCCESS_MESSAGE}
                    });
                }
                // Wrong Answer
                else {
                    setConfirmSubmissionDialog(prevState => {
                        const message = failTimes === 1 ? FAIL_MESSAGE : challenge.hint;
                        return {...prevState, is_opening: true, correctness: false, message: message}
                    });
                }
            })
            .catch(e => console.log(e));
    };

    const clickOnGoButton = (e) => {
        e.preventDefault();
        openChooseLicenseDialog(getAllSelectedChoices());
    };

    const countNumberOfSelectedChoices = () => {
        let count = 0;
        choices.forEach((choice) => {
            if (choice.is_selected) {
                count += 1;
            }
        });
        return count;
    };

    const clickOnAChoice = (choiceNumber) => {
        // console.log('choiceNumber :>> ', choiceNumber);
        // console.log('challenge :>> ', challenge);
        // console.log('questionTypes :>> ', questionTypes);
        // console.log('choices :>> ', choices);
        if (challenge.type === questionTypes.SELF_GENERATED) {
            openChooseLicenseDialog([choiceNumber]);
        } else if (challenge.type === questionTypes.SELF_GENERATED_WITH_TWO_CHOICES) {
            if (choices[choiceNumber].is_selected) {
                unselectSelectedChoices([choiceNumber]);
            } else if (countNumberOfSelectedChoices() <= 1) {
                let newChoices = [...choices];
                newChoices[choiceNumber].is_selected = true;
                setChoices(newChoices);
            }
        } else if (challenge.correctAnswer === choiceNumber) {
            setResultsOfLevels({
                ...resultsOfLevels,
                [challenge.level]: challenge.choices[challenge.correctAnswer].CC_license
            });
            setConfirmSubmissionDialog(prevState => {
                return {...prevState, is_opening: true, correctness: true, message: SUCCESS_MESSAGE}
            });
        } else {
            setConfirmSubmissionDialog(prevState => {
                const message = failTimes < 2 ? FAIL_MESSAGE : challenge.hint;
                return {
                    ...prevState,
                    is_opening: true,
                    correctness: false,
                    message: message
                };
            });
            setFailTimes(failTimes + 1);
        }
    };

    /*
        @param bool enter enter = true means sliding in, enter = false means sliding out
     */
    const setTransition = (nextChallenge, enter) => {
        if (nextChallenge.hasOwnProperty('practices')) {
            setShowUp(prevState => (
                {
                    ...prevState,
                    stable_content: enter,
                    unstable_content: enter
                }
            ));
        } else {
            setShowUp(prevState => (
                {
                    ...prevState,
                    unstable_content: enter
                }
            ));
        }
    };

    const goToNextLevel = () => {
        // console.log('nextChallenge :>> ', nextChallenge);
        console.log('challenge :>> ', challenge);
        postProgress(window.accessToken, {
            [challenge.level]: {
                choices: challenge.choices,
                correctAnswer: challenge.correctAnswer,
                failTimes
            }
        })
            .then((res) => {
                console.log('res :>> ', res);
            })
            .catch(err => {
                console.log('err :>> ', err);
            })
        if (nextChallenge !== null) {
            setTransition(nextChallenge, false);

            // time out is required for exiting animation
            setTimeout((() => {
                setTransition(nextChallenge, true);
                setFailTimes(0);
                setChosenLicenses([]);
                setPractices(nextChallenge.practices);
                dispatchChallenge(
                    {
                        type: ACTIONS.TO_NEXT_LEVEL,
                        payload: {nextChallenge}
                    }
                );
            }), 500);
        } else {
            alert('Congratulation, end game');
        }
        setConfirmSubmissionDialog(prevState => {
            return {...prevState, is_opening: false}
        });

    };

    const finishPractice = (id) => {
        let finishedPracticeIndex = practices.findIndex(practice => practice.id === id);
        let newPractices = lodash.cloneDeep(practices);
        newPractices[finishedPracticeIndex].finished = true;
        setPractices(newPractices);
    };

    const getNextUnfinishedPractice = (practices) => {
        for (let i = 0; i < practices.length; i++) {
            if (!practices[i].finished) {
                return practices[i];
            }
        }
        return null;
    };

    useEffect(() => {
        changeToStoryBackground();
    });

    useEffect(() => {
        if (challenge.require_result_of_levels != null
            && challenge.require_result_of_levels.length !== 0
            && challenge.oer_resources.length === 0
        ) {
            dispatchChallenge({
                type: ACTIONS.PREPARE_OER_RESOURCES,
                payload: {resultsOfLevels}
            });
        }
    });

    useEffect(() => {
        // special case, just for the 6th level
        if (challenge.level === LAST_LEVEL && challenge.choices[challenge.correctAnswer].CC_license === null) {
            checkCompatible(window.accessToken, challenge.combination_type, challenge.oer_resources, 'check')
                .then(res => {
                    if (res.correctAnswer) {
                        dispatchChallenge({
                            type: ACTIONS.PREPARE_CHOICES_FOR_LAST_LEVEL,
                            payload: {correctAnswer: res.correctAnswer}
                        });
                    }
                })
                .catch(e => console.log(e));
        }
    });


    if (practices != null && getNextUnfinishedPractice(practices) !== null) {
        return <PracticeMode finishPractice={finishPractice} practice={getNextUnfinishedPractice(practices)}/>
    } else {
        return (
            <Grid container item direction={'row'} justify={'center'} alignItems={'center'} className={styles.root}>
                <Slide direction={'left'} in={showUp.stable_content} mountOnEnter unmountOnExit>
                    <img className={styles.smith} src={story_smith}/>
                </Slide>
                <ConfirmSubmission is_confirm_submission_dialog_opening={confirmSubmissionDialog.is_opening}
                                   close_confirm_submission_dialog={closeConfirmSubmissionDialog}
                                   go_to_next_level={goToNextLevel}
                                   correctness={confirmSubmissionDialog.correctness}
                                   message={confirmSubmissionDialog.message}
                                   set_confirm_submission_dialog={setConfirmSubmissionDialog}/>
                <ChooseLicenseDialog isChooseLicenseDialogOpening={isChooseLicenseDialogOpening}
                                     closeChooseLicenseDialog={closeChooseLicenseDialog}
                                     clickOnSubmitButton={clickOnSubmitButton}
                                     selectFinalLicense={selectFinalLicense}
                                     finalLicense={finalLicense}
                                     message={message}
                                     licenses_to_be_excluded_from_answer={challenge.licenses_to_be_excluded_from_answer}/>
                <Grid container item direction={'row'} justify={'center'} xs={11}>
                    <Grid container item xs={12} justify={'flex-start'}>
                        <Slide direction={'right'} in={showUp.stable_content} mountOnEnter unmountOnExit>
                            <Grid container item xs={11} className={styles.context}
                                  justify={'center'}>
                                {challenge.context}
                            </Grid>
                        </Slide>
                    </Grid>
                    <Grid container item xs={12} justify={'flex-start'}>
                        <Slide direction={'right'} in={showUp.unstable_content} mountOnEnter unmountOnExit>
                            <Grid container item xs={7} className={styles.picture} justify={'center'}
                                  alignItems={'center'}>
                                <img className={styles.image_container} src={story_description_image_container}/>
                                <img className={styles.image} src={challenge.description_image}/>
                            </Grid>
                        </Slide>
                    </Grid>
                    <Slide direction={'left'} in={showUp.unstable_content} mountOnEnter unmountOnExit>
                        <Grid container item className={styles.question} justify={'center'}
                              alignItems={'center'} xs={11}>
                            {challenge.question}
                        </Grid>
                    </Slide>
                    <Grid container item xs={12} justify={'space-between'}>
                        {
                            [...Array(4).keys()].map(choiceNumber => {
                                return (
                                    <Choice key={'storymode-choice-' + choiceNumber} clickOnAChoice={clickOnAChoice}
                                            display_text={challenge.choices[choiceNumber].display_text}
                                            choice_number={choiceNumber}
                                            is_selected={choices[choiceNumber].is_selected}
                                            show_up={showUp.unstable_content}/>
                                )
                            })
                        }
                    </Grid>
                    {
                        challenge.type === questionTypes.SELF_GENERATED_WITH_TWO_CHOICES &&
                        <Grid container item xs={12} justify={'center'}>
                            <Grid container item xs={4}>
                                <Button variant={'contained'} fullWidth className={styles.go_button}
                                        onClick={clickOnGoButton}>Go!!!</Button>
                            </Grid>
                        </Grid>
                    }
                </Grid>
            </Grid>
        );
    }
}

export default StoryMode;
