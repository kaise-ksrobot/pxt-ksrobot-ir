
const enum RemoteButton {
  A = 0xA2,
  B = 0x62,
  C = 0xE2,
  D = 0x22,
  E = 0xC2,
  F = 0xB0,
  UP = 0x02,
  DOWN = 0x98,
  LEFT = 0xE0,
  RIGHT = 0x90,
  STOP = 0xA8,
  NUM0 = 0x68,
  NUM1 = 0x30,
  NUM2 = 0x18,
  NUM3 = 0x7A,
  NUM4 = 0x10,
  NUM5 = 0x38,
  NUM6 = 0x5A,
  NUM7 = 0x42,
  NUM8 = 0x4A,
  NUM9 = 0x52
}


//% color=#00A6F0 weight=19 icon="\uf1eb" block="KSRobot_IR" 
namespace KSRobot_IR {

  let IRCommand = 0;
  let IRReceived_cnt = 0;
  let IRReceived_word = 0;
  let IR_Init = 0;

  const REMOTE_NEC_EVENT = 562;
  const REMOTE_PRESSED_EVENT = 563;
  const REMOTE_RELEASED_EVENT = 564;
  const REMOTE_COMPLETE_EVENT = 565;

  const INCOMPLETE_STATE = 0xF1;
  const COMPLETE_STATE = 0xF2;
  const WAIT_TIME = 0x7F;

  function remote_decode(head: number): number {

    IRReceived_cnt += 1;

    if (head < 1584) { //low

      IRReceived_word = (IRReceived_word << 1) + 0;

      if (IRReceived_cnt < 32) {
        return INCOMPLETE_STATE;
      }

      if (IRReceived_cnt === 32) {
        IRCommand = IRReceived_word & 0xffff;
        return COMPLETE_STATE;
      }

    } else if (head < 2688) { //high

      IRReceived_word = (IRReceived_word << 1) + 1;

      if (IRReceived_cnt < 32) {
        return INCOMPLETE_STATE;
      }

      if (IRReceived_cnt === 32) {
        IRCommand = IRReceived_word & 0xffff;
        return COMPLETE_STATE;
      }
    }
    IRReceived_cnt = 0;
    return INCOMPLETE_STATE;





  }


  //% blockId="ir_init"
  //% block="connect ir receiver to %pin"
  export function init(
    pin: DigitalPin
  ): void {

    let head = 0;
    let wait_time = 0;
    let newCommand = 0;
    let nowCommand = -1;
    let now_status = 0;

    if (IR_Init) {
      return;
    }
    IR_Init = 1;

    pins.setPull(pin, PinPullMode.PullNone);

    pins.onPulsed(pin, PulseValue.Low, () => {
      head = pins.pulseDuration();
    });

    pins.onPulsed(pin, PulseValue.High, () => {
      head = head + pins.pulseDuration();

      now_status = remote_decode(head);

      if (now_status !== INCOMPLETE_STATE) {
        control.raiseEvent(REMOTE_NEC_EVENT, now_status);
      }
    });


    control.onEvent(
      REMOTE_NEC_EVENT,
      EventBusValue.MICROBIT_EVT_ANY,
      () => {

        now_status = control.eventValue();

        if (now_status === COMPLETE_STATE) {

          wait_time = input.runningTime() + WAIT_TIME;

          control.raiseEvent(REMOTE_COMPLETE_EVENT, 0);

          newCommand = IRCommand >> 8;

          if (newCommand !== nowCommand) {
            if (nowCommand >= 0) {
              control.raiseEvent(
                REMOTE_RELEASED_EVENT,
                nowCommand
              );
            }

            nowCommand = newCommand;
            control.raiseEvent(
              REMOTE_PRESSED_EVENT,
              newCommand
            );
          }
        }
      }
    );

    control.inBackground(() => {
      while (true) {
        if (nowCommand === -1) {
          // wait
          basic.pause(2 * WAIT_TIME);
        } else {
          const now = input.runningTime();
          if (now > wait_time) {

            control.raiseEvent(
              REMOTE_RELEASED_EVENT,
              nowCommand
            );
            nowCommand = -1;
          } else {
            basic.pause(WAIT_TIME);
          }
        }
      }
    });
  }


  //% blockId=ir_received_left_event
  //% block="on |%btn| button pressed"
  export function onPressEvent(
    btn: RemoteButton,
    handler: () => void
  ) {
    control.onEvent(
      REMOTE_PRESSED_EVENT,
      btn,
      () => {
        handler();
      }
    );
  }









}
