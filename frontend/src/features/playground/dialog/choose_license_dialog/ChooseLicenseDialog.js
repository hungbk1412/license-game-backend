import React from 'react';
import {useDispatch, useSelector} from "react-redux";
import {close_choose_license_dialog, select_license} from "./ChooseLicenseDialogSlice";
import Form from "react-bootstrap/Form";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Modal from "@material-ui/core/Modal";
import {makeStyles} from "@material-ui/core/styles";
import {licenseTypes, color} from "../../../../definitions/Types";
import {story_dialog, story_dialog_dropdown_background} from "../../../../images";

const useStyles = makeStyles((theme) => ({
    pop_up: {
        'background-image': `url(${story_dialog})`,
        'background-size': '100% 100%',
        [theme.breakpoints.up('sm')]: {
            'position': 'absolute',
            'width': '400px',
            'height': '250px',
            'top': '50%',
            'left': '50%',
            'transform': 'translate(-50%,-50%)'
        },
        [theme.breakpoints.up('xl')]: {
            'position': 'absolute',
            'width': '400px',
            'height': '200px',
            'top': '50%',
            'left': '50%',
            'transform': 'translate(-50%,-50%)'
        }
    },
    full_size: {
        'height': '100%',
        'width': '100%'
    },
    message: {
        'margin-top': '10px',
        'color': color.NORMAL_TEXT_WHITE
    },
    submit_button: {
        'margin-bottom': '20px',
    },
    dropdown: {

    }
}));

function ChooseLicenseDialog(props) {
    const styles = useStyles();
    const dispatch = useDispatch();
    const {is_opening, message, licenses_to_be_excluded_from_answer, chosen_license} = useSelector(state => state.choose_license_dialog);
    const getToBeDisplayedLicenses = () => {
        if (!licenses_to_be_excluded_from_answer) {
            return Object.values(licenseTypes);
        }
        let result = [];
        for (const license in licenseTypes) {
            if (licenseTypes.hasOwnProperty(license)) {
                if (!licenses_to_be_excluded_from_answer.includes(licenseTypes[license])) {
                    result.push(licenseTypes[license]);
                }
            }
        }
        return result;
    };

    return (
        <Modal open={is_opening}
               onClose={() => dispatch(close_choose_license_dialog())}>
            <Grid className={styles.pop_up}>
                <Form onSubmit={props.clickOnSubmitButton} className={styles.full_size}>
                    <Grid container direction={'column'} alignItems={'center'} justify={'space-around'} className={styles.full_size}>
                        <Grid item className={styles.message}>
                            {message}
                        </Grid>
                        <Grid item>
                            <Form.Group>
                                <Form.Control as="select" value={chosen_license}
                                              onChange={(e) => dispatch(select_license(e.target.value))} className={styles.dropdown}>
                                    <option value={'none'}>Not combinable</option>
                                    {
                                        getToBeDisplayedLicenses().map(license => {
                                            return (
                                                <option value={license}
                                                        key={'ChooseLicenseDialog-' + license}>{license}</option>
                                            );
                                        })
                                    }
                                </Form.Control>
                            </Form.Group>
                        </Grid>
                        <Grid item>
                            <Button variant={'contained'} type={'submit'} className={styles.submit_button}>
                                Submit
                            </Button>
                        </Grid>
                    </Grid>
                </Form>
            </Grid>
        </Modal>
    );
}

export default ChooseLicenseDialog;