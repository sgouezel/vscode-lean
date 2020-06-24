import { Location } from '../src/shared';
import * as React from 'react';
import { post, CopyToCommentEvent, copyToComment } from './server';
import { LocationContext, ConfigContext } from '.';
import { Widget } from './widget';
import { Goal } from './goal';
import { Messages, processMessages } from './messages';
import { basename } from './util';
import { CopyToCommentIcon, PinnedIcon, PinIcon, ContinueIcon, PauseIcon, RefreshIcon, GoToFileIcon } from './svg_icons';
import { useInfo } from './event_model';
import { Details } from './collapsing';

type InfoStatus = 'updating' | 'error' | 'pinned' | 'cursor' | 'loading';

const statusColTable: {[T in InfoStatus]: string} = {
    'updating': '',
    'loading': 'gold',
    'cursor': '',
    'pinned': '',
    'error': 'dark-red',
}
interface InfoProps {
    loc: Location;
    isPinned: boolean;
    isCursor: boolean;
    onPin: (new_pin_state: boolean) => void;
    isPaused: boolean;
    setPaused: (paused: boolean) => void;
}

export function Info(props: InfoProps) {
    const {setPaused, onPin, isCursor, isPinned} = props;
    const {loc, isLoading:loading, isUpdating:updating, isPaused: paused, error:updateError, goalState, widget, messages: messages0, forceUpdate} = useInfo(props);
    const messages = processMessages(messages0);

    function copyGoalToComment() {
        if (goalState) copyToComment(goalState);
    }

    // If we are the cursor infoview, then we should subscribe to
    // some commands from the extension
    React.useEffect(() => {
        if (isCursor) {
            const h = CopyToCommentEvent.on(copyGoalToComment);
            return () => h.dispose();
        }
    }, [isCursor]);

    if (!loc) {
        return <div>Waiting for info... </div>
    }
    const status: InfoStatus = loading ? 'loading' : updating ? 'updating' : updateError ? 'error' : isPinned ? 'pinned' : 'cursor';
    const statusColor = statusColTable[status];
    const nothingToShow = !widget && !goalState && messages.length === 0;
    const locationString = `${basename(loc.file_name)}:${(loc).line}:${(loc).column}`;
    return <LocationContext.Provider value={loc}>
        <Details>
            <summary style={{transition: 'color 0.5s ease'}} className={'mv2 ' + statusColor}>
                {locationString}
                <span className="fr">
                    {goalState && <a className="link pointer mh2 dim" title="copy state to comment" onClick={e => {e.preventDefault(); copyGoalToComment()}}><CopyToCommentIcon/></a>}
                    {isPinned && <a className={'link pointer mh2 dim '} onClick={e => { e.preventDefault(); post({command: 'reveal', loc}); }} title="reveal file location"><GoToFileIcon/></a>}
                    <a className="link pointer mh2 dim" onClick={e => { e.preventDefault(); onPin(!isPinned)}} title={isPinned ? 'unpin' : 'pin'}>{isPinned ? <PinnedIcon/> : <PinIcon/>}</a>
                    <a className="link pointer mh2 dim" onClick={e => { e.preventDefault(); setPaused(!paused)}} title={paused ? 'continue updating' : 'pause updating'}>{paused ? <ContinueIcon/> : <PauseIcon/>}</a>
                    <a className={'link pointer mh2 dim ' + (updating ? 'spin' : '')} onClick={e => { e.preventDefault(); forceUpdate(); }} title="update"><RefreshIcon/></a>
                </span>
            </summary>
            <div className="ml1">
                <div>
                    {!loading && !updating && updateError &&
                        <div className="error">
                            Error updating: {updateError.message}.
                            <a className="link pointer dim" onClick={e => forceUpdate()}>Try again.</a>
                        </div> }
                </div>
                <div>
                    <Widget widget={widget} fileName={loc.file_name} />
                </div>
                <details open={!widget} className={goalState ? '' : 'dn'}>
                    <summary className="mv2 pointer">{widget ? 'Plaintext Tactic State' : 'Tactic State'}</summary>
                    <div className="ml1">
                        <Goal goalState={goalState} />
                    </div>
                </details>
                <details open className={messages.length === 0 ? 'dn' : '0'}>
                    <summary className="mv2 pointer">Messages ({messages.length})</summary>
                    <div className="ml1">
                        <Messages messages={messages}/>
                    </div>
                </details>
                {nothingToShow && (
                    loading ? 'Loading...' :
                    paused ? <span>Updating is paused. <a className="link pointer dim" onClick={e => forceUpdate()}>Refresh</a> or <a className="link pointer dim" onClick={e => setPaused(false)}>resume updating</a> to see information</span> :
                    `No info found at ${locationString}`)}
            </div>
        </Details>
    </LocationContext.Provider>;
}

